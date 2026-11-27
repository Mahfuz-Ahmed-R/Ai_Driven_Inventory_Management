import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from .auth_utils import decode_jwt
from .models import UserSession


@database_sync_to_async
def _authenticate_ws_token(token: str) -> bool:
    if not token:
        return False
    try:
        payload = decode_jwt(token, expected_type="access")
    except ValueError:
        return False
    session = UserSession.objects.select_related("user").filter(
        id=payload.get("sid"),
        user_id=payload.get("uid"),
        is_active=True,
        expires_at__gt=timezone.now(),
    ).first()
    return bool(session and session.user.is_active)


class AnalysisProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        is_authed = bool(user and user.is_authenticated and user.is_active)
        if not is_authed:
            qs = parse_qs((self.scope.get("query_string") or b"").decode("utf-8", errors="ignore"))
            token = (qs.get("token") or [""])[0].strip()
            is_authed = await _authenticate_ws_token(token)
        if not is_authed:
            await self.close(code=4401)
            return

        self.job_id = self.scope["url_route"]["kwargs"]["job_id"]
        self.group_name = f"analysis_{self.job_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def analysis_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

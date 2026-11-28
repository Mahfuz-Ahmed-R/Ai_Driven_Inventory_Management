import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from datetime import timedelta
from functools import wraps

import requests

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from .models import EmailOTP, UserSession

ACCESS_TOKEN_TTL_SECONDS = int(os.getenv("JWT_ACCESS_TTL_SECONDS", 1800))  # 30 mins
REFRESH_TOKEN_TTL_SECONDS = int(os.getenv("JWT_REFRESH_TTL_SECONDS", 604800))  # 7 days
RESET_TOKEN_TTL_SECONDS = 600  # 10 mins
OTP_TTL_MINUTES = 2
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", 30))


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    padding = "=" * ((4 - len(text) % 4) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _jwt_secret() -> bytes:
    return (getattr(settings, "SECRET_KEY", "dev-secret") or "dev-secret").encode("utf-8")


def encode_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    sig = hmac.new(_jwt_secret(), signing_input, hashlib.sha256).digest()
    return f"{h_b64}.{p_b64}.{_b64url_encode(sig)}"


def decode_jwt(token: str, expected_type: str | None = None) -> dict:
    if not token or token.count(".") != 2:
        raise ValueError("Malformed JWT token.")
    h_b64, p_b64, s_b64 = token.split(".")
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    expected_sig = hmac.new(_jwt_secret(), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(s_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid JWT signature.")

    payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
    now = int(time.time())
    if payload.get("exp") and now > int(payload["exp"]):
        raise ValueError("JWT token has expired.")
    if expected_type and payload.get("type") != expected_type:
        raise ValueError(f"Invalid token type (expected {expected_type}).")
    return payload


def create_session_and_tokens(user, request=None, remember_me: bool = True) -> tuple[UserSession, str, str]:
    now = int(time.time())
    refresh_jti = uuid.uuid4().hex
    access_jti = uuid.uuid4().hex
    session_ttl = REFRESH_TOKEN_TTL_SECONDS if remember_me else 86400
    user_agent = ""
    ip_address = ""
    if request is not None:
        user_agent = (request.META.get("HTTP_USER_AGENT") or "")[:250]
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        ip_address = (xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", ""))[:60]

    session = UserSession.objects.create(
        user=user,
        refresh_jti=refresh_jti,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=timezone.now() + timedelta(seconds=session_ttl),
    )

    access_payload = {
        "type": "access",
        "jti": access_jti,
        "sid": str(session.id),
        "uid": user.id,
        "email": user.email,
        "username": user.username,
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL_SECONDS,
    }
    refresh_payload = {
        "type": "refresh",
        "jti": refresh_jti,
        "sid": str(session.id),
        "uid": user.id,
        "iat": now,
        "exp": now + session_ttl,
    }
    return session, encode_jwt(access_payload), encode_jwt(refresh_payload)


def create_reset_token(user) -> str:
    now = int(time.time())
    return encode_jwt({
        "type": "reset",
        "jti": uuid.uuid4().hex,
        "uid": user.id,
        "email": user.email,
        "iat": now,
        "exp": now + RESET_TOKEN_TTL_SECONDS,
    })


def otp_resend_wait_seconds(email: str, purpose: str) -> int:
    """Return remaining cooldown seconds before another OTP can be issued for (email, purpose)."""
    normalized = email.strip().lower()
    latest = EmailOTP.objects.filter(email=normalized, purpose=purpose, is_used=False).first()
    if not latest:
        return 0
    elapsed = (timezone.now() - latest.created_at).total_seconds()
    remaining = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
    return max(0, remaining)


def _send_otp_email(recipient: str, code: str, purpose: str) -> bool:
    """Send OTP via HTTPS email API (Resend/Brevo) or SMTP; return True on delivery."""
    subject = f"Inventory Planner Verification Code: {code}"
    body = f"Your Inventory Planner verification code is {code}. It expires in {OTP_TTL_MINUTES} minutes."
    from_email = os.getenv("DEFAULT_FROM_EMAIL", "Inventory Planner <noreply@inventoryplanner.local>")

    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                json={
                    "from": from_email,
                    "to": [recipient],
                    "subject": subject,
                    "text": body,
                },
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                timeout=8,
            )
            if 200 <= resp.status_code < 300:
                return True
        except Exception as exc:
            print(f"[OTP-EMAIL] Resend failed for {recipient}: {exc}", flush=True)

    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_key:
        try:
            sender_email = os.getenv("EMAIL_HOST_USER", "").strip() or from_email
            resp = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                json={
                    "sender": {"name": "Inventory Planner", "email": sender_email},
                    "to": [{"email": recipient}],
                    "subject": subject,
                    "textContent": body,
                },
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json",
                },
                timeout=8,
            )
            if 200 <= resp.status_code < 300:
                return True
        except Exception as exc:
            print(f"[OTP-EMAIL] Brevo failed for {recipient}: {exc}", flush=True)

    if os.getenv("EMAIL_HOST"):
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=from_email,
                recipient_list=[recipient],
                fail_silently=False,
            )
            return True
        except Exception as exc:
            print(f"[OTP-EMAIL] SMTP failed for {recipient}: {exc}", flush=True)

    print(f"[OTP-FALLBACK] email={recipient} purpose={purpose} code={code}", flush=True)
    return False


def issue_email_otp(email: str, purpose: str) -> EmailOTP:
    normalized = email.strip().lower()
    EmailOTP.objects.filter(email=normalized, purpose=purpose, is_used=False).update(is_used=True)
    code = f"{100000 + secrets.randbelow(900000)}"
    otp = EmailOTP.objects.create(
        email=normalized,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    _send_otp_email(normalized, code, purpose)
    return otp


def verify_email_otp(email: str, code: str, purpose: str) -> tuple[bool, str]:
    normalized = email.strip().lower()
    otp = EmailOTP.objects.filter(email=normalized, purpose=purpose, is_used=False).first()
    if not otp:
        return False, "No active OTP found. Please request a new code."
    if timezone.now() > otp.expires_at:
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return False, "OTP has expired. Please request a new code."
    if otp.attempts >= 5:
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return False, "Too many failed attempts. Please request a new code."
    if not hmac.compare_digest(otp.code, (code or "").strip()):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False, "Invalid OTP code."
    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True, "Verified"


def get_auth_context(request) -> tuple[object | None, UserSession | None, dict | None]:
    """Extract and validate Bearer JWT and its active UserSession."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None, None, None
    token = auth_header[7:].strip()
    try:
        payload = decode_jwt(token, expected_type="access")
    except ValueError:
        return None, None, None

    session = UserSession.objects.select_related("user").filter(
        id=payload.get("sid"),
        user_id=payload.get("uid"),
        is_active=True,
        expires_at__gt=timezone.now(),
    ).first()
    if not session or not session.user.is_active:
        return None, None, None
    session.save(update_fields=["last_seen_at"])
    return session.user, session, payload


def get_authenticated_user(request):
    """Return active authenticated User from Bearer JWT session or Django session."""
    user, _, _ = get_auth_context(request)
    if user is not None:
        return user
    req_user = getattr(request, "user", None)
    if req_user is not None and req_user.is_authenticated and req_user.is_active:
        return req_user
    return None


def require_auth(view_func):
    """Decorator enforcing an active authenticated user session on workspace endpoints."""
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        user = get_authenticated_user(request)
        if user is None:
            return Response(
                {"error": "Authentication required. Please sign in to access the workspace."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        request.auth_user = user
        request.user = user
        return view_func(request, *args, **kwargs)

    return _wrapped

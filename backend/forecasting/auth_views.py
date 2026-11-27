import re
import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from .auth_utils import (
    ACCESS_TOKEN_TTL_SECONDS,
    OTP_RESEND_COOLDOWN_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
    create_reset_token,
    create_session_and_tokens,
    decode_jwt,
    encode_jwt,
    get_auth_context,
    issue_email_otp,
    otp_resend_wait_seconds,
    verify_email_otp,
)
from .models import UserSession


def _validate_password_strength(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must include at least one letter and one number."
    return None


def _is_valid_email(email: str) -> bool:
    try:
        validate_email(email)
        return True
    except DjangoValidationError:
        return False


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.get_full_name() or user.first_name or user.username,
        "is_staff": user.is_staff,
    }


def _serialize_session(s: UserSession, current_sid: str | None = None) -> dict:
    return {
        "id": str(s.id),
        "user_agent": s.user_agent or "Web Browser",
        "ip_address": s.ip_address or "127.0.0.1",
        "is_active": s.is_active,
        "is_current": str(s.id) == str(current_sid) if current_sid else False,
        "created_at": s.created_at.isoformat(),
        "last_seen_at": s.last_seen_at.isoformat(),
        "expires_at": s.expires_at.isoformat(),
    }


@api_view(["POST"])
@parser_classes([JSONParser])
def register_view(request):
    name = (request.data.get("name") or "").strip()
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    field_errors = {}
    if not name or len(name) < 2:
        field_errors["name"] = "Full name must be at least 2 characters."
    if not email or not _is_valid_email(email):
        field_errors["email"] = "Enter a valid email address."
    pw_err = _validate_password_strength(password) if password else "Password is required."
    if pw_err:
        field_errors["password"] = pw_err
    if field_errors:
        first_err = next(iter(field_errors.values()))
        return Response({"error": first_err, "field_errors": field_errors}, status=status.HTTP_400_BAD_REQUEST)

    existing = User.objects.filter(email__iexact=email).first()
    if existing and existing.is_active:
        return Response(
            {
                "error": "An account with this email already exists. Please sign in instead.",
                "field_errors": {"email": "This email is already registered."},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if existing and not existing.is_active:
        existing.first_name = name[:150]
        existing.set_password(password)
        existing.save()
        user = existing
    else:
        base_username = re.sub(r"[^a-zA-Z0-9._-]", "", email.split("@")[0])[:30] or "user"
        username = base_username
        idx = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username[:24]}{idx}"
            idx += 1
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=name[:150],
            is_active=False,  # Activated after Email OTP verification
        )

    if os.getenv("AUTO_VERIFY_REGISTRATION", "True").lower() == "true":
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])
        session, access, refresh = create_session_and_tokens(user, request, remember_me=True)
        return Response({
            "ok": True,
            "requires_otp": False,
            "message": "Account created and signed in.",
            "access": access,
            "refresh": refresh,
            "session_id": str(session.id),
            "user": _serialize_user(user),
        }, status=status.HTTP_201_CREATED)

    otp = issue_email_otp(email, "register")
    payload = {
        "ok": True,
        "message": f"Verification code sent to {email}.",
        "email": email,
        "purpose": "register",
        "requires_otp": True,
        "otp_length": 6,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
    }
    if settings.DEBUG:
        payload["dev_otp"] = otp.code
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@parser_classes([JSONParser])
def login_view(request):
    identifier = (request.data.get("email") or request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    require_two_step = bool(request.data.get("two_step", False))
    remember_me = bool(request.data.get("remember_me", True))

    if not identifier or not password:
        return Response({"error": "Email/username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=identifier, password=password)
    if not user and "@" in identifier:
        u_obj = User.objects.filter(email__iexact=identifier).first()
        if u_obj:
            if not u_obj.is_active and u_obj.check_password(password):
                if os.getenv("AUTO_VERIFY_REGISTRATION", "True").lower() == "true":
                    u_obj.is_active = True
                    u_obj.save(update_fields=["is_active"])
                else:
                    otp = issue_email_otp(u_obj.email, "register")
                    resp = {
                        "error": "Account not verified yet. A new verification code has been sent to your email.",
                        "requires_otp": True,
                        "purpose": "register",
                        "email": u_obj.email,
                        "otp_length": 6,
                        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
                    }
                    if settings.DEBUG:
                        resp["dev_otp"] = otp.code
                    return Response(resp, status=status.HTTP_403_FORBIDDEN)
            user = authenticate(username=u_obj.username, password=password)

    if not user:
        return Response({"error": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)

    if require_two_step:
        otp = issue_email_otp(user.email, "two_step")
        resp = {
            "ok": True,
            "requires_otp": True,
            "purpose": "two_step",
            "email": user.email,
            "otp_length": 6,
            "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
            "message": f"Two-step verification code sent to {user.email}.",
        }
        if settings.DEBUG:
            resp["dev_otp"] = otp.code
        return Response(resp)

    login(request, user)
    session, access_token, refresh_token = create_session_and_tokens(user, request, remember_me=remember_me)
    return Response({
        "ok": True,
        "access": access_token,
        "refresh": refresh_token,
        "session_id": str(session.id),
        "remember_me": remember_me,
        "user": _serialize_user(user),
    })


@api_view(["POST"])
@parser_classes([JSONParser])
def send_otp_view(request):
    email = (request.data.get("email") or "").strip().lower()
    purpose = request.data.get("purpose") or "register"
    if purpose not in {"register", "forgot_password", "two_step"}:
        return Response({"error": "Invalid OTP purpose."}, status=status.HTTP_400_BAD_REQUEST)
    if not email or not _is_valid_email(email):
        return Response({"error": "Valid email is required."}, status=status.HTTP_400_BAD_REQUEST)

    wait = otp_resend_wait_seconds(email, purpose)
    if wait > 0:
        return Response(
            {"error": f"Please wait {wait}s before requesting a new code.", "retry_after": wait},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user_exists = User.objects.filter(email__iexact=email).exists()
    resp = {
        "ok": True,
        "message": f"If eligible, a verification code was sent to {email}.",
        "email": email,
        "purpose": purpose,
        "otp_length": 6,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
    }
    if user_exists:
        otp = issue_email_otp(email, purpose)
        if settings.DEBUG:
            resp["dev_otp"] = otp.code
    return Response(resp)


@api_view(["POST"])
@parser_classes([JSONParser])
def verify_otp_view(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()
    purpose = request.data.get("purpose") or "register"
    if not email or not code:
        return Response({"error": "Email and OTP code are required."}, status=status.HTTP_400_BAD_REQUEST)

    ok, msg = verify_email_otp(email, code, purpose)
    if not ok:
        return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({"error": "Account not found for this email."}, status=status.HTTP_404_NOT_FOUND)

    if purpose == "forgot_password":
        reset_token = create_reset_token(user)
        return Response({
            "ok": True,
            "purpose": "forgot_password",
            "reset_token": reset_token,
            "message": "OTP verified. You may now set a new password.",
        })

    if purpose == "register" and not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])

    login(request, user)
    session, access_token, refresh_token = create_session_and_tokens(user, request)
    return Response({
        "ok": True,
        "purpose": purpose,
        "access": access_token,
        "refresh": refresh_token,
        "session_id": str(session.id),
        "user": _serialize_user(user),
    })


@api_view(["POST"])
@parser_classes([JSONParser])
def forgot_password_view(request):
    email = (request.data.get("email") or "").strip().lower()
    if not email or not _is_valid_email(email):
        return Response({"error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)

    wait = otp_resend_wait_seconds(email, "forgot_password")
    if wait > 0:
        return Response(
            {"error": f"Please wait {wait}s before requesting another reset code.", "retry_after": wait},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user = User.objects.filter(email__iexact=email).first()
    resp = {
        "ok": True,
        "email": email,
        "purpose": "forgot_password",
        "otp_length": 6,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
        "message": f"If an account exists for {email}, a reset code has been sent.",
    }
    if user:
        otp = issue_email_otp(email, "forgot_password")
        if settings.DEBUG:
            resp["dev_otp"] = otp.code
    return Response(resp)


@api_view(["POST"])
@parser_classes([JSONParser])
def reset_password_view(request):
    reset_token = (request.data.get("reset_token") or "").strip()
    new_password = request.data.get("new_password") or ""
    if not reset_token or not new_password:
        return Response({"error": "reset_token and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)
    pw_err = _validate_password_strength(new_password)
    if pw_err:
        return Response({"error": pw_err}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = decode_jwt(reset_token, expected_type="reset")
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    user = get_object_or_404(User, id=payload.get("uid"))
    user.set_password(new_password)
    user.is_active = True
    user.save()
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
    return Response({"ok": True, "message": "Password updated successfully. Please sign in."})


@api_view(["POST"])
@parser_classes([JSONParser])
def refresh_token_view(request):
    refresh_token = (request.data.get("refresh") or "").strip()
    if not refresh_token:
        return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = decode_jwt(refresh_token, expected_type="refresh")
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

    session = UserSession.objects.select_related("user").filter(
        id=payload.get("sid"),
        refresh_jti=payload.get("jti"),
        is_active=True,
        expires_at__gt=timezone.now(),
    ).first()
    if not session or not session.user.is_active:
        return Response({"error": "Session expired or revoked."}, status=status.HTTP_401_UNAUTHORIZED)

    now = int(time.time())
    new_refresh_jti = uuid.uuid4().hex
    session.refresh_jti = new_refresh_jti
    # Keep original 7-day absolute expiration so users must re-login after 7 days
    session.save(update_fields=["refresh_jti", "last_seen_at"])

    refresh_exp = int(session.expires_at.timestamp())
    new_access = encode_jwt({
        "type": "access",
        "jti": uuid.uuid4().hex,
        "sid": str(session.id),
        "uid": session.user.id,
        "email": session.user.email,
        "username": session.user.username,
        "iat": now,
        "exp": min(now + ACCESS_TOKEN_TTL_SECONDS, refresh_exp),
    })
    new_refresh = encode_jwt({
        "type": "refresh",
        "jti": new_refresh_jti,
        "sid": str(session.id),
        "uid": session.user.id,
        "iat": now,
        "exp": refresh_exp,
    })
    return Response({"ok": True, "access": new_access, "refresh": new_refresh, "user": _serialize_user(session.user)})


@api_view(["GET"])
def me_view(request):
    user, session, _ = get_auth_context(request)
    if not user and request.user.is_authenticated:
        return Response({"authenticated": True, "user": _serialize_user(request.user), "session": None})
    if not user:
        return Response({"authenticated": False, "user": None, "session": None}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"authenticated": True, "user": _serialize_user(user), "session": _serialize_session(session, str(session.id))})


@api_view(["POST"])
@parser_classes([JSONParser])
def logout_view(request):
    user, session, _ = get_auth_context(request)
    if session:
        session.is_active = False
        session.save(update_fields=["is_active"])
    logout(request)
    return Response({"ok": True, "message": "Signed out and session revoked."})


@api_view(["POST"])
@parser_classes([JSONParser])
def unlock_session_view(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    user, _, _ = get_auth_context(request)
    target_email = email or (user.email if user else "")
    if not target_email or not password:
        return Response({"error": "Email and password are required to unlock."}, status=status.HTTP_400_BAD_REQUEST)

    u_obj = User.objects.filter(email__iexact=target_email).first()
    auth_user = authenticate(username=u_obj.username if u_obj else target_email, password=password)
    if not auth_user:
        return Response({"error": "Incorrect password."}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, auth_user)
    session, access_token, refresh_token = create_session_and_tokens(auth_user, request)
    return Response({
        "ok": True,
        "access": access_token,
        "refresh": refresh_token,
        "session_id": str(session.id),
        "user": _serialize_user(auth_user),
    })


@api_view(["GET"])
def sessions_list_view(request):
    user, current_session, _ = get_auth_context(request)
    if not user:
        return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    sessions = UserSession.objects.filter(user=user, is_active=True, expires_at__gt=timezone.now())
    sid = str(current_session.id) if current_session else None
    return Response([_serialize_session(s, sid) for s in sessions])


@api_view(["DELETE"])
def session_revoke_view(request, session_id):
    user, _, _ = get_auth_context(request)
    if not user:
        return Response({"error": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    s = get_object_or_404(UserSession, id=session_id, user=user)
    s.is_active = False
    s.save(update_fields=["is_active"])
    return Response({"ok": True, "revoked_id": str(session_id)})

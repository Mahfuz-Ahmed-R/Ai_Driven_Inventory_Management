import uuid
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from .auth_utils import get_authenticated_user, require_auth
from .models import AnalysisJob, Product, ReferralEvent, WorkspaceProfile

TIER_CONFIGS = {
    "free": {
        "key": "free",
        "label": "Free",
        "price": 0,
        "max_products": 50,
        "max_jobs": 5,
        "pdf_export": False,
        "policy_benchmark": False,
        "ai_copilot": False,
        "bulk_actions": True,
    },
    "basic": {
        "key": "basic",
        "label": "Basic",
        "price": 29,
        "max_products": 250,
        "max_jobs": 25,
        "pdf_export": True,
        "policy_benchmark": False,
        "ai_copilot": False,
        "bulk_actions": True,
    },
    "pro": {
        "key": "pro",
        "label": "Pro",
        "price": 79,
        "max_products": 2000,
        "max_jobs": 150,
        "pdf_export": True,
        "policy_benchmark": True,
        "ai_copilot": True,
        "bulk_actions": True,
    },
    "enterprise": {
        "key": "enterprise",
        "label": "Enterprise",
        "price": 199,
        "max_products": 999999,
        "max_jobs": 999999,
        "pdf_export": True,
        "policy_benchmark": True,
        "ai_copilot": True,
        "bulk_actions": True,
    },
}


def get_active_workspace_profile(request=None) -> WorkspaceProfile:
    user = None
    if request is not None:
        user = get_authenticated_user(request)
    if user is not None:
        key = f"user:{user.id}"
        profile, _ = WorkspaceProfile.objects.get_or_create(
            key=key,
            defaults={
                "user": user,
                "referral_code": f"DREAMS-{user.id:03d}-{uuid.uuid4().hex[:4].upper()}",
                "referral_clicks": 0,
            },
        )
    else:
        profile, _ = WorkspaceProfile.objects.get_or_create(
            key="default",
            defaults={"referral_code": "DREAMS-AI-2026", "referral_clicks": 0},
        )
    return profile


def _serialize_saas_state(profile: WorkspaceProfile) -> dict:
    tier_cfg = TIER_CONFIGS.get(profile.plan_tier, TIER_CONFIGS["free"])
    products_count = Product.objects.count()
    jobs_count = AnalysisJob.objects.count()
    events = ReferralEvent.objects.filter(referrer_code=profile.referral_code)
    total_signups = events.count()
    converted = events.filter(status__in=["active", "rewarded"]).count()
    total_earned = sum(e.reward_amount for e in events.filter(status="rewarded"))

    return {
        "plan_tier": profile.plan_tier,
        "tier_config": tier_cfg,
        "all_tiers": TIER_CONFIGS,
        "usage": {
            "products_count": products_count,
            "products_limit": tier_cfg["max_products"],
            "jobs_count": jobs_count,
            "jobs_limit": tier_cfg["max_jobs"],
        },
        "onboarding": {
            "completed": profile.onboarding_completed,
            "step": profile.onboarding_step,
            "data": profile.onboarding_data or {},
        },
        "referral": {
            "code": profile.referral_code,
            "clicks": profile.referral_clicks,
            "total_signups": total_signups,
            "converted": converted,
            "total_earned": round(total_earned, 2),
        },
    }


@api_view(["GET"])
@require_auth
def saas_state_view(request):
    profile = get_active_workspace_profile(request)
    return Response(_serialize_saas_state(profile))


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def saas_upgrade_view(request):
    plan_tier = (request.data.get("plan_tier") or "").strip().lower()
    if plan_tier not in TIER_CONFIGS:
        return Response({"error": f"Invalid plan_tier '{plan_tier}'."}, status=status.HTTP_400_BAD_REQUEST)
    profile = get_active_workspace_profile(request)
    profile.plan_tier = plan_tier
    profile.save(update_fields=["plan_tier", "updated_at"])
    return Response(_serialize_saas_state(profile))


@api_view(["GET", "PATCH"])
@parser_classes([JSONParser])
@require_auth
def saas_onboarding_view(request):
    profile = get_active_workspace_profile(request)
    if request.method == "GET":
        return Response(_serialize_saas_state(profile)["onboarding"])

    data = request.data
    if "step" in data:
        profile.onboarding_step = max(0, min(10, int(data.get("step") or 0)))
    if "data" in data and isinstance(data.get("data"), dict):
        merged = dict(profile.onboarding_data or {})
        merged.update(data["data"])
        profile.onboarding_data = merged
    if "completed" in data:
        profile.onboarding_completed = bool(data.get("completed"))
    profile.save()
    return Response(_serialize_saas_state(profile)["onboarding"])


@api_view(["GET"])
@require_auth
def saas_referrals_view(request):
    profile = get_active_workspace_profile(request)
    events = ReferralEvent.objects.filter(referrer_code=profile.referral_code)
    state = _serialize_saas_state(profile)["referral"]
    return Response({
        "summary": state,
        "events": [
            {
                "id": e.id,
                "referred_email": e.referred_email,
                "referred_company": e.referred_company,
                "plan_tier": e.plan_tier,
                "status": e.status,
                "reward_amount": e.reward_amount,
                "created_at": e.created_at.strftime("%Y-%m-%d"),
            }
            for e in events
        ],
    })


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def saas_referrals_track_view(request):
    profile = get_active_workspace_profile(request)
    action = (request.data.get("action") or "click").strip().lower()

    if action == "click":
        profile.referral_clicks += 1
        profile.save(update_fields=["referral_clicks", "updated_at"])
    elif action == "signup":
        email = (request.data.get("email") or "").strip() or f"partner{profile.referral_clicks + 1}@retail.io"
        company = (request.data.get("company") or "").strip() or "New Partner Retail"
        plan_tier = (request.data.get("plan_tier") or "pro").strip().lower()
        reward = 40.0 if plan_tier in ("pro", "enterprise") else 15.0
        ReferralEvent.objects.create(
            referrer_code=profile.referral_code,
            referred_email=email,
            referred_company=company,
            plan_tier=plan_tier,
            status="pending",
            reward_amount=reward,
        )
    elif action == "convert":
        event_id = request.data.get("event_id")
        ev = ReferralEvent.objects.filter(id=event_id, referrer_code=profile.referral_code).first()
        if not ev:
            return Response({"error": "Referral event not found."}, status=status.HTTP_404_NOT_FOUND)
        ev.status = "rewarded"
        ev.save(update_fields=["status"])
    else:
        return Response({"error": "Unsupported referral action."}, status=status.HTTP_400_BAD_REQUEST)

    return Response(_serialize_saas_state(profile)["referral"])


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def bulk_products_action_view(request):
    skus = request.data.get("skus") or []
    action = (request.data.get("action") or "").strip().lower()
    if not isinstance(skus, list) or not skus:
        return Response({"error": "Provide a non-empty list of SKUs."}, status=status.HTTP_400_BAD_REQUEST)

    qs = Product.objects.filter(sku__in=skus)
    with transaction.atomic():
        if action == "delete":
            deleted_count, _ = qs.delete()
            return Response({"ok": True, "affected": deleted_count})
        if action == "update_category":
            category = (request.data.get("category") or "").strip()
            if not category:
                return Response({"error": "category is required."}, status=status.HTTP_400_BAD_REQUEST)
            updated = qs.update(category=category)
            return Response({"ok": True, "affected": updated})
        if action == "update_warehouse":
            warehouse = (request.data.get("warehouse") or "").strip()
            if not warehouse:
                return Response({"error": "warehouse is required."}, status=status.HTTP_400_BAD_REQUEST)
            updated = qs.update(warehouse=warehouse)
            return Response({"ok": True, "affected": updated})

    return Response({"error": f"Unsupported bulk action '{action}'."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def bulk_jobs_delete_view(request):
    ids = request.data.get("ids") or []
    if not isinstance(ids, list) or not ids:
        return Response({"error": "Provide a non-empty list of job IDs."}, status=status.HTTP_400_BAD_REQUEST)
    deleted_count, _ = AnalysisJob.objects.filter(id__in=ids, user=request.user).delete()
    return Response({"ok": True, "affected": deleted_count})

"""REST endpoints for Intelligent CSV Upload, Classification, Mapping, Validation & Confirmation."""

from __future__ import annotations

import logging
import uuid
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response

from .auth_utils import require_auth
from .models import AnalysisJob, UploadedDataset
from .pipeline_runner import launch_analysis_thread
from .saas_views import TIER_CONFIGS, get_active_workspace_profile
from ml_engine.ingestion import (
    CSVUploadService,
    DataTransformationService,
    DataValidationService,
    DatasetClassificationService,
    LLMColumnMappingService,
)
from ml_engine.ingestion.schemas import DatasetClassification
from ml_engine.ingestion.upload_service import CSVUploadError

logger = logging.getLogger(__name__)


def _build_standardized_preview(raw_df, resolved_mapping: dict[str, str]) -> tuple[list[dict], dict]:
    try:
        transformer = DataTransformationService()
        std_df, trans_meta = transformer.transform(raw_df, resolved_mapping)
        preview_df = std_df.head(8).copy()
        preview_df["date"] = preview_df["date"].dt.strftime("%Y-%m-%d")
        rows = preview_df.fillna("").to_dict(orient="records")
        return rows, trans_meta
    except Exception:
        return [], {}


def _serialize_dataset_response(ds: UploadedDataset, standardized_preview: list[dict] | None = None, trans_meta: dict | None = None) -> dict:
    val_rep = ds.validation_report or {}
    total_rows = max(1, int(val_rep.get("total_rows") or (ds.dataset_profile or {}).get("row_count") or 1))
    valid_rows = int(val_rep.get("valid_rows") or total_rows)
    quality_score = round(min(100.0, max(0.0, (valid_rows / total_rows) * 100.0)), 1) if val_rep else None
    return {
        "dataset_id": str(ds.id),
        "filename": ds.original_filename,
        "file_size_bytes": ds.file_size_bytes,
        "company_name": ds.company_name,
        "status": ds.status,
        "classification": ds.classification,
        "classification_confidence": ds.classification_confidence,
        "analysis_source": ds.analysis_source,
        "classification_result": ds.classification_payload,
        "column_mapping": ds.column_mapping,
        "validation_report": val_rep,
        "profile": ds.dataset_profile,
        "quality_score": quality_score,
        "analysis_job_id": str(ds.analysis_job_id) if ds.analysis_job_id else None,
        "analysis_job_status": ds.analysis_job.status if ds.analysis_job else None,
        "created_at": ds.created_at.isoformat(),
        "updated_at": ds.updated_at.isoformat(),
        "standardized_preview": standardized_preview if standardized_preview is not None else [],
        "transformation_meta": trans_meta if trans_meta is not None else {},
    }


def _check_onboarding_completed(profile):
    if not profile.onboarding_completed:
        return Response(
            {
                "error": "Please complete workspace onboarding setup before uploading a CSV.",
                "code": "ONBOARDING_REQUIRED",
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@require_auth
def inspect_uploaded_csv(request):
    """Step 1: Upload CSV, preserve original file, classify with Gemini + backend checks, map columns, and validate."""
    profile = get_active_workspace_profile(request)
    blocked = _check_onboarding_completed(profile)
    if blocked is not None:
        return blocked

    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"error": "No CSV file uploaded under 'file'."}, status=status.HTTP_400_BAD_REQUEST)

    company_name = (request.data.get("company_name") or "Partner Retail Corp").strip()
    dataset_id = uuid.uuid4()

    upload_svc = CSVUploadService()
    try:
        stored = upload_svc.validate_and_store_raw(str(dataset_id), uploaded.name, uploaded.read())
    except CSVUploadError as exc:
        return Response({"error": str(exc), "code": "UPLOAD_ERROR"}, status=status.HTTP_400_BAD_REQUEST)

    raw_df = stored["raw_df"]
    profile = stored["profile"]

    mapping_svc = LLMColumnMappingService()
    llm_result, analysis_source = mapping_svc.analyze_dataset(profile)

    clf_svc = DatasetClassificationService()
    clf_result = clf_svc.evaluate(raw_df, llm_result)
    resolved_mapping = clf_result["resolved_mapping"]

    val_svc = DataValidationService()
    val_report = val_svc.validate(raw_df, resolved_mapping).model_dump()

    std_preview: list[dict] = []
    trans_meta: dict = {}
    if clf_result["accepted"] and val_report["can_proceed"]:
        std_preview, trans_meta = _build_standardized_preview(raw_df, resolved_mapping)

    if not clf_result["accepted"] and clf_result["classification"] != DatasetClassification.AMBIGUOUS_DATASET.value:
        ds_status = "rejected"
    elif clf_result["needs_user_confirmation"] or not val_report["can_proceed"]:
        ds_status = "needs_mapping"
    else:
        ds_status = "validated"

    ds = UploadedDataset.objects.create(
        id=dataset_id,
        user=request.user,
        company_name=company_name,
        original_filename=stored["safe_filename"],
        file_size_bytes=stored["file_size_bytes"],
        raw_file_path=stored["raw_file_path"],
        status=ds_status,
        classification=clf_result["classification"],
        classification_confidence=clf_result["classification_confidence"],
        analysis_source=analysis_source,
        classification_payload=clf_result,
        column_mapping=resolved_mapping,
        validation_report=val_report,
        dataset_profile=profile,
    )

    return Response(
        _serialize_dataset_response(ds, std_preview, trans_meta),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def revalidate_dataset_mapping(request, dataset_id):
    """Step 2: Apply user-edited column mapping, re-run backend checks & Python validation."""
    ds = get_object_or_404(UploadedDataset, id=dataset_id, user=request.user)
    user_mapping = request.data.get("column_mapping")
    if not isinstance(user_mapping, dict):
        return Response({"error": "column_mapping must be an object mapping target_field -> source_column."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        raw_df = CSVUploadService.read_raw_from_path(ds.raw_file_path)
    except CSVUploadError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    valid_cols = set(str(c) for c in raw_df.columns)
    cleaned_mapping = {
        str(k): str(v)
        for k, v in user_mapping.items()
        if v and str(v) in valid_cols
    }

    # Re-verify required columns deterministically
    backend_checks = DatasetClassificationService._verify_required_columns_in_df(raw_df, cleaned_mapping)
    val_report = DataValidationService().validate(raw_df, cleaned_mapping).model_dump()

    clf_payload = dict(ds.classification_payload or {})
    clf_payload["resolved_mapping"] = cleaned_mapping
    clf_payload["backend_checks"] = backend_checks
    clf_payload["missing_required_fields"] = [f for f in ("date", "product_id", "quantity") if f not in cleaned_mapping]

    # If user explicitly mapped valid date, product_id, and quantity on an Ambiguous dataset, allow Sales History
    is_rejected_domain = ds.classification not in (
        DatasetClassification.SALES_HISTORY.value,
        DatasetClassification.AMBIGUOUS_DATASET.value,
    )
    if not is_rejected_domain and backend_checks["date_valid"] and backend_checks["quantity_valid"] and backend_checks["product_id_valid"]:
        clf_payload["accepted"] = True
        clf_payload["rejection_reason"] = ""
        clf_payload["classification"] = DatasetClassification.SALES_HISTORY.value
        ds.classification = DatasetClassification.SALES_HISTORY.value

    std_preview: list[dict] = []
    trans_meta: dict = {}
    if clf_payload.get("accepted") and val_report["can_proceed"]:
        std_preview, trans_meta = _build_standardized_preview(raw_df, cleaned_mapping)
        ds.status = "validated"
    elif is_rejected_domain:
        ds.status = "rejected"
    else:
        ds.status = "needs_mapping"

    ds.column_mapping = cleaned_mapping
    ds.classification_payload = clf_payload
    ds.validation_report = val_report
    ds.save()

    return Response(_serialize_dataset_response(ds, std_preview, trans_meta))


@api_view(["POST"])
@parser_classes([JSONParser])
@require_auth
def confirm_and_run_forecast(request, dataset_id):
    """Step 3: Transform validated dataset into Universal Internal Schema and launch forecasting job."""
    profile = get_active_workspace_profile(request)
    blocked = _check_onboarding_completed(profile)
    if blocked is not None:
        return blocked

    tier_cfg = TIER_CONFIGS.get(profile.plan_tier, TIER_CONFIGS["free"])
    if AnalysisJob.objects.filter(user=request.user).count() >= tier_cfg["max_jobs"]:
        return Response(
            {
                "error": f"Forecast job limit ({tier_cfg['max_jobs']}) reached for {tier_cfg['label']} plan. Upgrade or delete old jobs.",
                "code": "TIER_LIMIT",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    ds = get_object_or_404(UploadedDataset, id=dataset_id, user=request.user)
    if ds.status == "rejected" or not (ds.classification_payload or {}).get("accepted"):
        return Response(
            {"error": (ds.classification_payload or {}).get("rejection_reason") or "Dataset was rejected and cannot be forecasted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (ds.validation_report or {}).get("can_proceed"):
        return Response(
            {"error": "Dataset has blocking validation errors. Please fix mappings or upload a valid Sales History CSV."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    company_name = (request.data.get("company_name") or ds.company_name or "Partner Retail Corp").strip()
    try:
        lead_time_days = max(1, min(30, int(request.data.get("lead_time_days", 4))))
    except (TypeError, ValueError):
        lead_time_days = 4

    try:
        raw_df = CSVUploadService.read_raw_from_path(ds.raw_file_path)
    except CSVUploadError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    transformer = DataTransformationService()
    std_df, trans_meta = transformer.transform(raw_df, ds.column_mapping, dataset_id=str(ds.id))
    forecaster_df = transformer.to_forecaster_df(std_df)

    ds.processed_file_path = trans_meta.get("processed_file_path", "")
    ds.company_name = company_name
    ds.status = "confirmed"

    job = AnalysisJob.objects.create(
        user=request.user,
        company_name=company_name,
        filename=ds.original_filename,
        lead_time_days=lead_time_days,
        status="pending",
    )
    ds.analysis_job = job
    ds.save()

    extra_meta = {
        **trans_meta,
        "dataset_id": str(ds.id),
        "classification": ds.classification,
        "column_mapping": ds.column_mapping,
    }
    launch_analysis_thread(str(job.id), standardized_df=forecaster_df, extra_meta=extra_meta)
    return Response({"job_id": str(job.id), "dataset_id": str(ds.id), "status": "pending"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@require_auth
def list_uploaded_datasets(request):
    """List uploaded datasets belonging to the authenticated user."""
    datasets = UploadedDataset.objects.filter(user=request.user).select_related("analysis_job")[:30]
    return Response([_serialize_dataset_response(ds) for ds in datasets])


@api_view(["GET", "DELETE"])
@require_auth
def dataset_detail(request, dataset_id):
    """Inspect or delete a single uploaded dataset owned by the authenticated user."""
    ds = get_object_or_404(UploadedDataset, id=dataset_id, user=request.user)
    if request.method == "DELETE":
        ds.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    std_preview: list[dict] = []
    trans_meta: dict = {}
    if ds.raw_file_path and ds.column_mapping:
        try:
            raw_df = CSVUploadService.read_raw_from_path(ds.raw_file_path)
            std_preview, trans_meta = _build_standardized_preview(raw_df, ds.column_mapping)
        except Exception:
            pass
    return Response(_serialize_dataset_response(ds, std_preview, trans_meta))

import csv
import io
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .auth_utils import require_auth
from .models import AnalysisJob
from .pipeline_runner import launch_analysis_thread
from .saas_views import TIER_CONFIGS, get_active_workspace_profile
from ml_engine.ingestion.upload_service import CSVUploadService, MAX_CSV_SIZE_BYTES
from ml_engine.validator import generate_sample_csv_bytes
from ml_engine.pdf_report import build_pdf_report


def _serialize_job_summary(job: AnalysisJob) -> dict:
    return {
        "id": str(job.id),
        "company_name": job.company_name,
        "filename": job.filename,
        "lead_time_days": job.lead_time_days,
        "status": job.status,
        "error_message": job.error_message,
        "dataset_meta": job.dataset_meta,
        "summary_kpis": job.summary_kpis,
        "created_at": job.created_at.isoformat(),
    }


def _serialize_job_detail(job: AnalysisJob) -> dict:
    data = _serialize_job_summary(job)
    data["category_breakdown"] = job.category_breakdown
    data["aggregate_trajectory"] = job.aggregate_trajectory
    data["gemini_executive_summary"] = getattr(getattr(job, "report", None), "gemini_executive_summary", "")
    data["policies"] = [
        {
            "policy_key": p.policy_key,
            "policy_name": p.policy_name,
            "total_cost": p.total_cost,
            "holding_cost": p.holding_cost,
            "stockout_cost": p.stockout_cost,
            "stockout_units": p.stockout_units,
            "avg_inventory": p.avg_inventory,
            "fill_rate": p.fill_rate,
            "net_profit": p.net_profit,
        }
        for p in job.policies.all()
    ]
    data["skus"] = [
        {
            "id": s.id,
            "sku": s.sku,
            "product_name": s.product_name,
            "category": s.category,
            "store_id": s.store_id,
            "price": s.price,
            "current_stock": s.current_stock,
            "avg_daily_velocity": s.avg_daily_velocity,
            "total_28d_demand": s.total_28d_demand,
            "days_left": s.days_left,
            "run_out_date": s.run_out_date,
            "urgency": s.urgency,
            "safety_stock": s.safety_stock,
            "reorder_point": s.reorder_point,
            "suggested_order_qty": s.suggested_order_qty,
            "order_cost": s.order_cost,
            "reorder_by": s.reorder_by,
            "method": s.method,
            "forecast_payload": s.forecast_payload,
            "sawtooth_payload": s.sawtooth_payload,
        }
        for s in job.skus.all()
    ]
    return data


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "engine": "LightGBM + Digital Twin + Gemini"})


@api_view(["GET"])
@require_auth
def download_sample_csv(request):
    csv_bytes = generate_sample_csv_bytes()
    resp = HttpResponse(csv_bytes, content_type="text/csv")
    resp["Content-Disposition"] = 'attachment; filename="sample_retail_sales.csv"'
    return resp


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@require_auth
def upload_csv(request):
    profile = get_active_workspace_profile(request)
    tier_cfg = TIER_CONFIGS.get(profile.plan_tier, TIER_CONFIGS["free"])
    if AnalysisJob.objects.count() >= tier_cfg["max_jobs"]:
        return Response(
            {"error": f"Forecast job limit ({tier_cfg['max_jobs']}) reached for {tier_cfg['label']} plan. Upgrade or delete old jobs.", "code": "TIER_LIMIT"},
            status=status.HTTP_403_FORBIDDEN,
        )
    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"error": "No CSV file uploaded under 'file'."}, status=status.HTTP_400_BAD_REQUEST)

    safe_name = CSVUploadService.sanitize_filename(uploaded.name)
    if not safe_name.lower().endswith(".csv"):
        return Response({"error": "Unsupported file format. Only .csv files are accepted."}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded.size and uploaded.size > MAX_CSV_SIZE_BYTES:
        mb = MAX_CSV_SIZE_BYTES / (1024 * 1024)
        return Response({"error": f"File exceeds maximum allowed size of {mb:.0f} MB."}, status=status.HTTP_400_BAD_REQUEST)

    ob_data = profile.onboarding_data or {}

    company_name = request.data.get("company_name") or ob_data.get("company_name") or "Partner Retail Corp"
    default_lt = ob_data.get("default_lead_time", 4)
    try:
        lead_time_days = max(1, min(30, int(request.data.get("lead_time_days", default_lt))))
    except (TypeError, ValueError):
        lead_time_days = 4

    file_bytes = uploaded.read()
    if not file_bytes or len(file_bytes) > MAX_CSV_SIZE_BYTES:
        return Response({"error": "Uploaded CSV file is empty or exceeds size limit."}, status=status.HTTP_400_BAD_REQUEST)

    job = AnalysisJob.objects.create(
        company_name=company_name,
        filename=safe_name,
        lead_time_days=lead_time_days,
        status="pending",
    )
    launch_analysis_thread(str(job.id), file_bytes)
    return Response({"job_id": str(job.id), "status": "pending"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@require_auth
def list_jobs(request):
    jobs = AnalysisJob.objects.all()[:25]
    return Response([_serialize_job_summary(j) for j in jobs])


@api_view(["GET", "DELETE"])
@require_auth
def job_detail(request, job_id):
    job = get_object_or_404(AnalysisJob, id=job_id)
    if request.method == "DELETE":
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(_serialize_job_detail(job))


@api_view(["GET"])
@require_auth
def download_pdf_report(request, job_id):
    profile = get_active_workspace_profile(request)
    tier_cfg = TIER_CONFIGS.get(profile.plan_tier, TIER_CONFIGS["free"])
    if not tier_cfg.get("pdf_export"):
        return Response(
            {"error": "PDF Executive Export requires Basic plan or higher.", "code": "TIER_LOCKED"},
            status=status.HTTP_403_FORBIDDEN,
        )
    job = get_object_or_404(AnalysisJob, id=job_id)
    if job.status != "completed":
        return Response({"error": "Report is not ready yet."}, status=status.HTTP_400_BAD_REQUEST)
    data = _serialize_job_detail(job)
    pdf_bytes = build_pdf_report(data)
    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="inventory_report_{job.id}.pdf"'
    return resp


@api_view(["GET"])
@require_auth
def export_forecast_csv(request, job_id):
    job = get_object_or_404(AnalysisJob, id=job_id)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "SKU", "Product Name", "Category", "Current Stock", "Avg Daily Velocity",
        "28D Forecast Demand", "Days Left", "Run-Out Date", "Urgency",
        "Safety Stock", "Reorder Point", "Suggested Order Qty", "Order Cost ($)", "Reorder By",
    ])
    for s in job.skus.all():
        writer.writerow([
            s.sku, s.product_name, s.category, s.current_stock, s.avg_daily_velocity,
            s.total_28d_demand, s.days_left, s.run_out_date, s.urgency,
            s.safety_stock, s.reorder_point, s.suggested_order_qty, s.order_cost, s.reorder_by,
        ])
    resp = HttpResponse(buf.getvalue().encode("utf-8"), content_type="text/csv")
    resp["Content-Disposition"] = f'attachment; filename="replenishment_plan_{job.id}.csv"'
    return resp

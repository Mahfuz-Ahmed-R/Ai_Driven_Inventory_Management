"""Runs the end-to-end ML + Digital Twin + Gemini pipeline in background and streams WebSocket updates."""

from __future__ import annotations

import threading
import time
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import numpy as np

from .models import AnalysisJob, SKUForecast, PolicyBenchmark, BusinessReport
from ml_engine.validator import parse_and_validate_csv
from ml_engine.forecaster import forecast_with_backtest
from ml_engine.digital_twin import simulate_sku_digital_twin
from ml_engine.policy_bench import run_policy_benchmark
from ml_engine.gemini_analyst import generate_executive_summary


def _emit(job_id: str, payload: dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f"analysis_{job_id}",
        {"type": "analysis_event", "payload": payload},
    )


def execute_analysis_job(
    job_id: str,
    file_bytes: bytes | None = None,
    standardized_df=None,
    extra_meta: dict | None = None,
):
    job = AnalysisJob.objects.get(id=job_id)
    job.status = "processing"
    job.save(update_fields=["status"])

    # Brief pause so WebSocket client has time to subscribe after HTTP POST returns
    time.sleep(0.35)

    try:
        # Step 1: Validate & normalize CSV (or use pre-validated standardized DataFrame)
        _emit(job_id, {
            "step": 1,
            "status": "running",
            "progress": 15,
            "message": "Validating CSV schema & normalizing daily time series...",
        })
        if standardized_df is not None:
            normalized_df = standardized_df
            meta = dict(extra_meta or {})
        else:
            normalized_df, meta = parse_and_validate_csv(file_bytes or b"")
        job.dataset_meta = meta
        job.save(update_fields=["dataset_meta"])
        _emit(job_id, {
            "step": 1,
            "status": "done",
            "progress": 25,
            "message": f"Validated {meta['num_skus']} SKUs across {meta['num_days']} days ({meta['date_start']} to {meta['date_end']}).",
        })

        # Step 2: Feature engineering, chronological backtest & 28-day rollout
        _emit(job_id, {
            "step": 2,
            "status": "running",
            "progress": 42,
            "message": "Engineering features, backtesting LightGBM vs Seasonal-Naive & generating 28-day forecasts...",
        })
        forecasts, backtest_metrics = forecast_with_backtest(normalized_df, horizon=28)
        meta["backtest"] = backtest_metrics
        job.dataset_meta = meta
        job.save(update_fields=["dataset_meta"])
        _emit(job_id, {
            "step": 2,
            "status": "done",
            "progress": 58,
            "message": f"Selected {backtest_metrics['selected_model']} and generated 28-day forecasts for {len(forecasts)} SKUs.",
        })

        # Step 3: Digital Twin Simulation
        _emit(job_id, {
            "step": 3,
            "status": "running",
            "progress": 70,
            "message": f"Running Digital Twin inventory simulation (Lead time: {job.lead_time_days}d)...",
        })
        sku_objects = []
        sku_dicts = []
        for sku_id, f_data in forecasts.items():
            dt_res = simulate_sku_digital_twin(f_data, lead_time_days=job.lead_time_days)
            sku_obj = SKUForecast(
                job=job,
                sku=sku_id,
                product_name=f_data["product_name"],
                category=f_data["category"],
                store_id=f_data["store_id"],
                price=f_data["price"],
                current_stock=f_data["current_stock"],
                avg_daily_velocity=f_data["avg_daily_velocity"],
                total_28d_demand=f_data["total_28d_demand"],
                days_left=dt_res["days_left"],
                run_out_date=dt_res["run_out_date"],
                urgency=dt_res["urgency"],
                safety_stock=dt_res["safety_stock"],
                reorder_point=dt_res["reorder_point"],
                suggested_order_qty=dt_res["suggested_order_qty"],
                order_cost=dt_res["order_cost"],
                reorder_by=dt_res["reorder_by"],
                method=f_data["method"],
                forecast_payload={
                    "history_dates": f_data["history_dates"],
                    "history_sales": f_data["history_sales"],
                    "forecast_dates": f_data["forecast_dates"],
                    "forecast_sales": f_data["forecast_sales"],
                    "forecast_lower": f_data["forecast_lower"],
                    "forecast_upper": f_data["forecast_upper"],
                },
                sawtooth_payload=dt_res["sawtooth"],
            )
            sku_objects.append(sku_obj)
            sku_dicts.append({
                "sku": sku_id,
                "product_name": f_data["product_name"],
                "category": f_data["category"],
                "current_stock": f_data["current_stock"],
                "days_left": dt_res["days_left"],
                "run_out_date": dt_res["run_out_date"],
                "urgency": dt_res["urgency"],
                "suggested_order_qty": dt_res["suggested_order_qty"],
                "order_cost": dt_res["order_cost"],
                "total_28d_demand": f_data["total_28d_demand"],
                "price": f_data["price"],
            })

        SKUForecast.objects.bulk_create(sku_objects)

        # Step 4: Policy Benchmark (EOQ vs Safety-Stock vs ML)
        _emit(job_id, {
            "step": 4,
            "status": "running",
            "progress": 82,
            "message": "Benchmarking EOQ vs Safety-Stock vs ML/AI Replenishment Policies...",
        })
        policy_summary = run_policy_benchmark(forecasts, lead_time=job.lead_time_days)
        PolicyBenchmark.objects.bulk_create([
            PolicyBenchmark(job=job, **p) for p in policy_summary
        ])

        # Aggregate KPIs & Charts
        total_forecast_units = round(sum(s["total_28d_demand"] for s in sku_dicts), 1)
        projected_revenue = round(sum(s["total_28d_demand"] * s["price"] for s in sku_dicts), 2)
        total_inventory_value = round(sum(s["current_stock"] * s["price"] for s in sku_dicts), 2)
        total_reorder_cost = round(sum(s["order_cost"] for s in sku_dicts), 2)
        critical_skus = sorted([s for s in sku_dicts if s["urgency"] == "critical"], key=lambda x: x["days_left"])
        watch_count = sum(1 for s in sku_dicts if s["urgency"] == "watch")
        overstock_count = sum(1 for s in sku_dicts if s["urgency"] == "overstock")

        eoq_row = next((p for p in policy_summary if p["policy_key"] == "eoq"), {})
        ml_row = next((p for p in policy_summary if p["policy_key"] == "ml"), {})
        savings_vs_eoq = round(max(0.0, eoq_row.get("total_cost", 0.0) - ml_row.get("total_cost", 0.0)), 2)

        kpis = {
            "total_skus": len(sku_dicts),
            "total_forecast_units": total_forecast_units,
            "projected_revenue": projected_revenue,
            "total_inventory_value": total_inventory_value,
            "total_reorder_cost": total_reorder_cost,
            "critical_count": len(critical_skus),
            "watch_count": watch_count,
            "overstock_count": overstock_count,
            "ai_fill_rate": ml_row.get("fill_rate", 98.5),
            "cost_savings_vs_eoq": savings_vs_eoq,
        }

        # Category breakdown
        cat_map: dict[str, dict] = {}
        for s in sku_dicts:
            c = s["category"]
            if c not in cat_map:
                cat_map[c] = {"category": c, "demand_units": 0.0, "revenue": 0.0, "sku_count": 0}
            cat_map[c]["demand_units"] += s["total_28d_demand"]
            cat_map[c]["revenue"] += s["total_28d_demand"] * s["price"]
            cat_map[c]["sku_count"] += 1
        cat_list = [
            {
                "category": v["category"],
                "demand_units": round(v["demand_units"], 1),
                "revenue": round(v["revenue"], 2),
                "sku_count": v["sku_count"],
            }
            for v in sorted(cat_map.values(), key=lambda x: -x["demand_units"])
        ]

        # Aggregate 28-day history + 28-day forecast trajectory
        sample_first = next(iter(forecasts.values()))
        h_dates = sample_first["history_dates"]
        f_dates = sample_first["forecast_dates"]
        agg_traj = []
        for idx, d in enumerate(h_dates):
            total_h = sum(v["history_sales"][idx] for v in forecasts.values() if idx < len(v["history_sales"]))
            agg_traj.append({"date": d, "actual": round(total_h, 1), "forecast": None})
        for idx, d in enumerate(f_dates):
            total_f = sum(v["forecast_sales"][idx] for v in forecasts.values() if idx < len(v["forecast_sales"]))
            agg_traj.append({"date": d, "actual": None, "forecast": round(total_f, 1)})

        job.summary_kpis = kpis
        job.category_breakdown = cat_list
        job.aggregate_trajectory = agg_traj

        # Step 5: Gemini Executive Analyst (streaming tokens over WebSocket!)
        _emit(job_id, {
            "step": 5,
            "status": "running",
            "progress": 90,
            "message": "Gemini AI Analyst is writing your Executive Business Report...",
        })

        def _on_token(tok: str):
            _emit(job_id, {"step": 5, "status": "streaming", "progress": 95, "token": tok})

        summary_text = generate_executive_summary(
            company_name=job.company_name,
            kpis=kpis,
            critical_skus=critical_skus,
            policy_summary=policy_summary,
            on_token=_on_token,
        )
        BusinessReport.objects.update_or_create(
            job=job,
            defaults={"gemini_executive_summary": summary_text},
        )

        job.status = "completed"
        job.save()

        _emit(job_id, {
            "step": 6,
            "status": "complete",
            "progress": 100,
            "message": "Business Analysis Report ready!",
            "job_id": str(job.id),
        })
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message"])
        _emit(job_id, {
            "step": 0,
            "status": "error",
            "progress": 0,
            "message": f"Analysis failed: {exc}",
        })


def launch_analysis_thread(
    job_id: str,
    file_bytes: bytes | None = None,
    standardized_df=None,
    extra_meta: dict | None = None,
):
    t = threading.Thread(
        target=execute_analysis_job,
        args=(job_id, file_bytes, standardized_df, extra_meta),
        daemon=True,
    )
    t.start()

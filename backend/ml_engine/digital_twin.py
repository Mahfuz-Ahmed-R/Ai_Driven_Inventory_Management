"""Digital Twin Inventory Simulation Engine (Section 18 of notebook)."""

from __future__ import annotations

from datetime import datetime, timedelta
import numpy as np


def simulate_sku_digital_twin(
    sku_forecast: dict,
    lead_time_days: int = 4,
    service_level_z: float = 1.65,
) -> dict:
    """
    Simulate 28-day physical shelf inventory under forecasted demand:
    1) Baseline 'Do Nothing' trajectory (to find exact Run-Out Date & Days of Cover).
    2) AI-Replenished Sawtooth trajectory (with lead_time_days supplier transit).
    """
    preds = np.array(sku_forecast["forecast_sales"], dtype=float)
    f_dates = sku_forecast["forecast_dates"]
    on_hand_start = float(sku_forecast["current_stock"])
    velocity = max(0.1, float(sku_forecast["avg_daily_velocity"]))
    price = float(sku_forecast["price"])

    # 1. Days of Cover & Run-Out Date (if no reorder is placed)
    temp_stock = on_hand_start
    days_left = 28
    run_out_date = "Safe (>28d)"
    for idx, demand in enumerate(preds):
        temp_stock -= demand
        if temp_stock <= 0:
            days_left = idx + 1
            run_out_date = f_dates[idx]
            break
    else:
        est_days = int(round(on_hand_start / velocity))
        days_left = min(999, max(29, est_days))

    # Urgency classification (Inventory Planner style)
    if days_left <= lead_time_days + 3:
        urgency = "critical"  # red
    elif days_left <= lead_time_days + 10:
        urgency = "watch"     # yellow
    elif days_left >= 60:
        urgency = "overstock" # blue/gray
    else:
        urgency = "healthy"   # green

    # Safety stock & Suggested Order Quantity (Inventory Planner formula)
    demand_std = max(0.3, float(np.std(sku_forecast["history_sales"])))
    safety_stock = int(np.ceil(service_level_z * demand_std * np.sqrt(lead_time_days)))
    cover_target_days = lead_time_days + 14  # cover lead time + 2-week cycle
    target_demand = float(np.sum(preds[: min(len(preds), cover_target_days)]))
    suggested_order_qty = max(0, int(np.ceil(target_demand + safety_stock - on_hand_start)))
    order_cost = round(suggested_order_qty * price * 0.55, 2)  # assume ~45% gross margin

    # Recommended Reorder-By Date
    reorder_day_idx = max(0, min(len(f_dates) - 1, days_left - lead_time_days - 2))
    if suggested_order_qty == 0:
        reorder_by = "No action needed"
    elif days_left <= lead_time_days + 1:
        reorder_by = "IMMEDIATE"
    else:
        reorder_by = f_dates[reorder_day_idx]

    # 2. Simulated 28-day Sawtooth Trajectory (with AI replenishment)
    rop = int(np.ceil(velocity * lead_time_days + safety_stock))
    batch_qty = max(suggested_order_qty, int(np.ceil(velocity * 10)))
    on_hand = on_hand_start
    pipeline: dict[int, float] = {}
    sawtooth = []
    stockout_days = 0
    unfulfilled_units = 0.0

    for t in range(len(preds)):
        arrived = pipeline.pop(t, 0.0)
        on_hand += arrived
        demand = preds[t]
        if on_hand >= demand:
            on_hand -= demand
            stockout_flag = 0
        else:
            unfulfilled_units += (demand - on_hand)
            on_hand = 0.0
            stockout_flag = 1
            stockout_days += 1

        # Trigger AI reorder if stock + in-transit <= ROP
        in_transit = sum(pipeline.values())
        if on_hand + in_transit <= rop and batch_qty > 0:
            arrival_day = t + lead_time_days
            if arrival_day < len(preds):
                pipeline[arrival_day] = pipeline.get(arrival_day, 0.0) + batch_qty

        sawtooth.append({
            "date": f_dates[t],
            "on_hand": round(on_hand, 1),
            "demand": round(demand, 1),
            "restock": round(arrived, 1),
            "rop": rop,
            "stockout": stockout_flag,
        })

    return {
        "days_left": int(days_left),
        "run_out_date": run_out_date,
        "urgency": urgency,
        "safety_stock": int(safety_stock),
        "reorder_point": int(rop),
        "suggested_order_qty": int(suggested_order_qty),
        "order_cost": float(order_cost),
        "reorder_by": reorder_by,
        "stockout_days": int(stockout_days),
        "unfulfilled_units": round(float(unfulfilled_units), 1),
        "sawtooth": sawtooth,
    }

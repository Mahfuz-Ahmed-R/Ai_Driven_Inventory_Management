"""Tiered Hybrid Forecaster: Chronological Backtesting + LightGBM (Tweedie) vs Seasonal-Naive."""

from __future__ import annotations

from datetime import timedelta
import numpy as np
import pandas as pd
import lightgbm as lgb

from .feature_engine import PCA_PRUNED_FEATURES, add_calendar_features, build_training_features


HORIZON_DAYS = 28


def _fit_lgbm(train_feat_df: pd.DataFrame) -> lgb.LGBMRegressor | None:
    sku_counts = train_feat_df.groupby("sku")["sales"].count()
    rich_skus = sku_counts[sku_counts >= 35].index.tolist()
    if not rich_skus:
        return None
    train_sub = train_feat_df[train_feat_df["sku"].isin(rich_skus)].dropna(subset=["lag_28"]).copy()
    if len(train_sub) < 30:
        return None

    X_train = train_sub[PCA_PRUNED_FEATURES].astype("float32")
    y_train = train_sub["sales"].astype("float32")
    model = lgb.LGBMRegressor(
        objective="tweedie",
        tweedie_variance_power=1.1,
        learning_rate=0.03,
        num_leaves=63,
        n_estimators=220,
        subsample=0.85,
        colsample_bytree=0.75,
        min_child_samples=min(50, max(5, len(train_sub) // 20)),
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model.fit(X_train, y_train)
    return model


def _recursive_lgbm_rollout(model: lgb.LGBMRegressor, history: list[float], future_cal: pd.DataFrame, horizon: int) -> list[float]:
    buf = list(history)
    preds = []
    for h_idx in range(horizon):
        cal_row = future_cal.iloc[h_idx]
        row = {
            "lag_1": buf[-1],
            "lag_7": buf[-7] if len(buf) >= 7 else float(np.mean(buf)),
            "lag_14": buf[-14] if len(buf) >= 14 else float(np.mean(buf)),
            "lag_28": buf[-28] if len(buf) >= 28 else float(np.mean(buf)),
            "rolling_mean_7": float(np.mean(buf[-7:])),
            "rolling_mean_28": float(np.mean(buf[-28:])),
            "rolling_std_28": float(np.std(buf[-28:])) if len(buf) > 1 else 0.0,
            "wday": int(cal_row["wday"]),
            "sin_day_of_year": float(cal_row["sin_day_of_year"]),
            "cos_day_of_year": float(cal_row["cos_day_of_year"]),
            "is_event": int(cal_row["is_event"]),
            "days_to_event": int(cal_row["days_to_event"]),
        }
        X_step = pd.DataFrame([row])[PCA_PRUNED_FEATURES].astype("float32")
        y_hat = float(max(0.0, model.predict(X_step)[0]))
        preds.append(round(y_hat, 2))
        buf.append(y_hat)
    return preds


def _seasonal_naive_rollout(history: list[float], horizon: int) -> list[float]:
    if not history:
        return [0.0] * horizon
    season = history[-7:] if len(history) >= 7 else history
    return [round(float(max(0.0, season[h_idx % len(season)])), 2) for h_idx in range(horizon)]


def _evaluate_chronological_backtest(normalized_df: pd.DataFrame) -> dict:
    """
    Hold out the latest window chronologically, compare LightGBM (Tweedie) against
    Seasonal-Naive (Lag-7), and select the better-performing model.
    """
    dates = pd.to_datetime(normalized_df["date"]).sort_values().unique()
    n_days = len(dates)
    if n_days < 49:
        return {
            "evaluated": False,
            "selected_model": "LightGBM (Tweedie)" if n_days >= 35 else "Cold-Start Adaptive",
            "eval_days": 0,
            "lgb_mae": None,
            "lgb_rmse": None,
            "naive_mae": None,
            "naive_rmse": None,
            "reason": f"Dataset has {n_days} days (<49 days needed for chronological lag-28 backtest).",
        }

    eval_days = min(28, max(7, n_days // 5))
    cutoff_date = dates[-eval_days - 1]
    train_df = normalized_df[pd.to_datetime(normalized_df["date"]) <= cutoff_date].copy()
    val_df = normalized_df[pd.to_datetime(normalized_df["date"]) > cutoff_date].copy()

    train_feat = build_training_features(train_df)
    bt_model = _fit_lgbm(train_feat)
    if bt_model is None:
        return {
            "evaluated": False,
            "selected_model": "Cold-Start Adaptive",
            "eval_days": eval_days,
            "lgb_mae": None,
            "lgb_rmse": None,
            "naive_mae": None,
            "naive_rmse": None,
            "reason": "Insufficient >=35-day SKUs in train split for LightGBM backtest.",
        }

    val_dates = pd.date_range(pd.to_datetime(cutoff_date) + timedelta(days=1), periods=eval_days, freq="D")
    val_cal = add_calendar_features(pd.DataFrame({"date": val_dates}))

    lgb_errs, naive_errs = [], []
    for sku, t_grp in train_df.groupby("sku"):
        v_grp = val_df[val_df["sku"] == sku].sort_values("date")
        if len(v_grp) < eval_days or len(t_grp) < 35:
            continue
        hist = t_grp.sort_values("date")["sales"].to_numpy(dtype=float).tolist()
        actuals = v_grp["sales"].to_numpy(dtype=float)[:eval_days]
        lgb_preds = np.array(_recursive_lgbm_rollout(bt_model, hist, val_cal, eval_days), dtype=float)
        naive_preds = np.array(_seasonal_naive_rollout(hist, eval_days), dtype=float)
        lgb_errs.extend((actuals - lgb_preds).tolist())
        naive_errs.extend((actuals - naive_preds).tolist())

    if not lgb_errs:
        return {
            "evaluated": False,
            "selected_model": "LightGBM (Tweedie)",
            "eval_days": 0,
            "lgb_mae": None,
            "lgb_rmse": None,
            "naive_mae": None,
            "naive_rmse": None,
            "reason": "No eligible SKUs for backtest comparison.",
        }

    lgb_arr = np.array(lgb_errs, dtype=float)
    naive_arr = np.array(naive_errs, dtype=float)
    lgb_mae = round(float(np.mean(np.abs(lgb_arr))), 4)
    lgb_rmse = round(float(np.sqrt(np.mean(lgb_arr ** 2))), 4)
    naive_mae = round(float(np.mean(np.abs(naive_arr))), 4)
    naive_rmse = round(float(np.sqrt(np.mean(naive_arr ** 2))), 4)

    use_lgbm = (lgb_mae <= naive_mae * 1.02) or (lgb_rmse < naive_rmse)
    selected = "LightGBM (Tweedie)" if use_lgbm else "Seasonal-Naive (Lag-7)"
    reason = (
        f"Chronological {eval_days}-day backtest: LightGBM (MAE {lgb_mae}, RMSE {lgb_rmse}) "
        f"{'outperformed' if use_lgbm else 'trailed'} Seasonal-Naive (MAE {naive_mae}, RMSE {naive_rmse})."
    )
    return {
        "evaluated": True,
        "selected_model": selected,
        "eval_days": eval_days,
        "lgb_mae": lgb_mae,
        "lgb_rmse": lgb_rmse,
        "naive_mae": naive_mae,
        "naive_rmse": naive_rmse,
        "reason": reason,
    }


def get_supported_horizons(n_days: int) -> list[int]:
    """Return forecast horizons supported by the available historical length."""
    if n_days >= 60:
        return [7, 14, 28, 60, 90]
    if n_days >= 28:
        return [7, 14, 28, 60]
    if n_days >= 14:
        return [7, 14, 28]
    return [7, 14]


def forecast_with_backtest(normalized_df: pd.DataFrame, horizon: int | None = None) -> tuple[dict[str, dict], dict]:
    """
    Run chronological backtest vs Seasonal-Naive, select winning model, refit on full history,
    and generate multi-horizon forecasts per SKU (up to 90 days when history supports it).
    """
    n_days = int(pd.to_datetime(normalized_df["date"]).nunique())
    supported_horizons = get_supported_horizons(n_days)
    if horizon is None:
        horizon = supported_horizons[-1]

    backtest = _evaluate_chronological_backtest(normalized_df)
    backtest["supported_horizons"] = supported_horizons
    selected_model = backtest["selected_model"]

    feat_df = build_training_features(normalized_df)
    model = _fit_lgbm(feat_df) if selected_model == "LightGBM (Tweedie)" else None

    last_date = pd.to_datetime(normalized_df["date"].max())
    future_dates = pd.date_range(last_date + timedelta(days=1), periods=horizon, freq="D")
    future_cal = add_calendar_features(pd.DataFrame({"date": future_dates}))

    results: dict[str, dict] = {}
    for sku, grp in normalized_df.groupby("sku"):
        grp = grp.sort_values("date")
        history = grp["sales"].to_numpy(dtype=float).tolist()
        hist_dates = grp["date"].dt.strftime("%Y-%m-%d").tolist()

        if selected_model == "Seasonal-Naive (Lag-7)" and len(history) >= 7:
            preds = _seasonal_naive_rollout(history, horizon)
            method = "Seasonal-Naive (Lag-7)"
        elif model is not None and len(history) >= 35:
            preds = _recursive_lgbm_rollout(model, history, future_cal, horizon)
            method = "LightGBM (Tweedie)"
        else:
            recent = np.array(history[-14:] if len(history) >= 14 else history, dtype=float)
            base_mean = float(np.mean(recent)) if len(recent) else 1.0
            preds = []
            for h_idx in range(horizon):
                wday = int(future_cal.iloc[h_idx]["wday"])
                w_boost = 1.2 if wday in (5, 6) else 0.95
                preds.append(round(max(0.1, base_mean * w_boost), 2))
            method = "Cold-Start Adaptive"

        hist_std = float(np.std(history[-28:])) if len(history) > 1 else 1.0
        # Uncertainty widens gently with horizon sqrt(step)
        lower = []
        upper = []
        for idx, p in enumerate(preds):
            spread = 1.28 * max(0.5, hist_std * 0.45) * (1.0 + 0.35 * np.sqrt(idx / 28.0))
            lower.append(round(max(0.0, p - spread), 2))
            upper.append(round(p + spread, 2))

        hist_avg_daily = round(float(np.mean(history)), 2) if history else 0.0
        # Demand trend: compare recent window vs previous equivalent window
        comp_win = min(28, len(history) // 2)
        if comp_win >= 3:
            recent_avg = float(np.mean(history[-comp_win:]))
            prev_avg = float(np.mean(history[-2 * comp_win:-comp_win]))
            demand_trend_pct = round(((recent_avg - prev_avg) / prev_avg) * 100.0, 1) if prev_avg > 0 else (100.0 if recent_avg > 0 else 0.0)
        else:
            demand_trend_pct = 0.0

        preds_28 = preds[:28]
        results[sku] = {
            "sku": sku,
            "product_name": str(grp["product_name"].iloc[-1]),
            "category": str(grp["category"].iloc[-1]),
            "store_id": str(grp["store_id"].iloc[-1]),
            "price": float(grp["price"].iloc[-1]),
            "current_stock": float(grp["current_stock"].iloc[-1]),
            "method": method,
            "history_dates": hist_dates[-180:],
            "history_sales": [round(float(v), 2) for v in history[-180:]],
            "hist_avg_daily": hist_avg_daily,
            "demand_trend_pct": demand_trend_pct,
            "forecast_dates": [d.strftime("%Y-%m-%d") for d in future_dates],
            "forecast_sales": preds,
            "forecast_lower": lower,
            "forecast_upper": upper,
            "avg_daily_velocity": round(float(np.mean(preds_28)), 2) if preds_28 else 0.0,
            "total_28d_demand": round(float(np.sum(preds_28)), 1),
        }

    return results, backtest


def forecast_all_skus(normalized_df: pd.DataFrame, horizon: int = HORIZON_DAYS) -> dict[str, dict]:
    """Backward-compatible wrapper returning SKU forecast dict."""
    results, _ = forecast_with_backtest(normalized_df, horizon=horizon)
    return results

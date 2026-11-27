"""PCA-pruned 10-feature domain engineering pipeline (Sections 8 & 17 of notebook)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import holidays


# Optimized 10-Feature Suite validated in Section 17 (MAE 0.8264 vs 0.8297 full 17-feature)
PCA_PRUNED_FEATURES = [
    "lag_1",
    "lag_7",
    "lag_14",
    "lag_28",
    "rolling_mean_7",
    "rolling_mean_28",
    "rolling_std_28",
    "wday",
    "sin_day_of_year",
    "cos_day_of_year",
    "is_event",
    "days_to_event",
]


def add_calendar_features(df: pd.DataFrame, country: str = "US") -> pd.DataFrame:
    """Attach weekday, circular annual harmonics, and holiday proximity countdown."""
    out = df.copy()
    dates = pd.to_datetime(out["date"])
    years = sorted(dates.dt.year.unique().tolist())
    try:
        cal_holidays = holidays.country_holidays(country, years=years)
    except Exception:
        cal_holidays = {}

    out["wday"] = (dates.dt.weekday + 1).astype("int8")  # 1=Mon .. 7=Sun
    doy = dates.dt.dayofyear
    out["sin_day_of_year"] = np.sin(2 * np.pi * doy / 365.25).astype("float32")
    out["cos_day_of_year"] = np.cos(2 * np.pi * doy / 365.25).astype("float32")

    # Holiday proximity (days_to_event clipped 0..15)
    unique_dates = pd.DataFrame({"date": pd.date_range(dates.min(), dates.max() + pd.Timedelta(days=15), freq="D")})
    unique_dates["is_event"] = unique_dates["date"].dt.date.isin(cal_holidays).astype("uint8")
    event_idx = np.where(unique_dates["is_event"] == 1, unique_dates.index, np.nan)
    unique_dates["days_to_event"] = (
        (pd.Series(event_idx).bfill() - unique_dates.index).clip(0, 15).fillna(15).astype("int8")
    )

    out = out.merge(unique_dates[["date", "is_event", "days_to_event"]], on="date", how="left")
    out["is_event"] = out["is_event"].fillna(0).astype("uint8")
    out["days_to_event"] = out["days_to_event"].fillna(15).astype("int8")
    return out


def build_training_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create lag and shifted rolling features (strictly shift(1) to prevent leakage)."""
    out = add_calendar_features(df)
    out = out.sort_values(["sku", "date"]).reset_index(drop=True)
    grouped = out.groupby("sku", observed=False)["sales"]

    for lag in [1, 7, 14, 28]:
        out[f"lag_{lag}"] = grouped.shift(lag)

    out["rolling_mean_7"] = grouped.shift(1).rolling(7, min_periods=1).mean().reset_index(level=0, drop=True)
    out["rolling_mean_28"] = grouped.shift(1).rolling(28, min_periods=1).mean().reset_index(level=0, drop=True)
    out["rolling_std_28"] = grouped.shift(1).rolling(28, min_periods=2).std().fillna(0.0).reset_index(level=0, drop=True)

    return out

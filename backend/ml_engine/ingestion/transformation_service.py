"""Data Transformation Service: converts validated raw CSV into Universal Internal Schema."""

from __future__ import annotations

import logging
from pathlib import Path
import numpy as np
import pandas as pd
from django.conf import settings

from .schemas import StandardField

logger = logging.getLogger(__name__)

UNIVERSAL_SCHEMA_COLUMNS = [
    "date",
    "product_id",
    "quantity",
    "product_name",
    "selling_price",
    "revenue",
    "discount",
    "category",
    "store_id",
]


class DataTransformationService:
    """
    Transforms a mapped raw CSV into the standardized internal schema without mutating
    the original uploaded file. Handles observation calendars explicitly.
    """

    def __init__(self):
        self.processed_dir = Path(settings.MEDIA_ROOT) / "uploads" / "processed"
        self.processed_dir.mkdir(parents=True, exist_ok=True)

    def transform(
        self,
        raw_df: pd.DataFrame,
        resolved_mapping: dict[str, str],
        dataset_id: str | None = None,
    ) -> tuple[pd.DataFrame, dict]:
        """
        Produce a standardized daily product-level DataFrame and transformation metadata.
        Explicitly tracks observed days vs zero-sales days vs missing calendar gaps.
        """
        date_col = resolved_mapping[StandardField.DATE.value]
        pid_col = resolved_mapping[StandardField.PRODUCT_ID.value]
        qty_col = resolved_mapping[StandardField.QUANTITY.value]

        work = pd.DataFrame()
        work["date"] = pd.to_datetime(raw_df[date_col], errors="coerce")
        work["product_id"] = raw_df[pid_col].astype(str).str.strip()
        work["quantity"] = pd.to_numeric(raw_df[qty_col], errors="coerce")

        # Filter only rows with valid required fields (invalid rows were already surfaced in ValidationReport)
        valid_mask = (
            work["date"].notna()
            & work["product_id"].ne("")
            & work["product_id"].str.lower().ne("nan")
            & work["quantity"].notna()
            & (work["quantity"] >= 0)
        )
        work = work.loc[valid_mask].copy()
        if work.empty:
            raise ValueError("No valid rows available for transformation.")

        idx = work.index
        name_col = resolved_mapping.get(StandardField.PRODUCT_NAME.value)
        price_col = resolved_mapping.get(StandardField.SELLING_PRICE.value)
        rev_col = resolved_mapping.get(StandardField.REVENUE.value)
        disc_col = resolved_mapping.get(StandardField.DISCOUNT.value)
        cat_col = resolved_mapping.get(StandardField.CATEGORY.value)
        store_col = resolved_mapping.get(StandardField.STORE_ID.value)
        stock_col = resolved_mapping.get(StandardField.CURRENT_STOCK.value)

        work["product_name"] = raw_df.loc[idx, name_col].fillna(work["product_id"]).astype(str).str.strip() if name_col else work["product_id"]
        work["category"] = raw_df.loc[idx, cat_col].fillna("General").astype(str).str.strip() if cat_col else "General"
        work["store_id"] = raw_df.loc[idx, store_col].fillna("MAIN_STORE").astype(str).str.strip() if store_col else "MAIN_STORE"
        work["selling_price"] = pd.to_numeric(raw_df.loc[idx, price_col], errors="coerce") if price_col else np.nan
        work["revenue"] = pd.to_numeric(raw_df.loc[idx, rev_col], errors="coerce") if rev_col else np.nan
        work["discount"] = pd.to_numeric(raw_df.loc[idx, disc_col], errors="coerce").fillna(0.0) if disc_col else 0.0
        work["current_stock"] = pd.to_numeric(raw_df.loc[idx, stock_col], errors="coerce") if stock_col else np.nan

        # Derive selling_price from revenue/quantity if price is missing
        if work["selling_price"].isna().all() and not work["revenue"].isna().all():
            safe_qty = work["quantity"].replace(0, np.nan)
            work["selling_price"] = (work["revenue"] / safe_qty).round(2)

        work["selling_price"] = work["selling_price"].fillna(18.0).clip(lower=0.5)
        if work["revenue"].isna().all():
            work["revenue"] = (work["quantity"] * work["selling_price"] - work["discount"]).clip(lower=0.0)
        else:
            work["revenue"] = work["revenue"].fillna(work["quantity"] * work["selling_price"]).clip(lower=0.0)

        # Aggregate transaction-level records into daily product-level sales
        daily = (
            work.groupby(["product_id", "date"], as_index=False)
            .agg(
                quantity=("quantity", "sum"),
                revenue=("revenue", "sum"),
                discount=("discount", "sum"),
                selling_price=("selling_price", "mean"),
                product_name=("product_name", "last"),
                category=("category", "last"),
                store_id=("store_id", "last"),
                current_stock=("current_stock", "last"),
            )
        )
        daily["observation_status"] = np.where(daily["quantity"] == 0, "zero_sales", "observed")

        # Establish explicit observation calendar without blindly pretending missing dates = 0 demand
        min_date = daily["date"].min()
        max_date = daily["date"].max()
        all_dates = pd.date_range(min_date, max_date, freq="D")
        products = daily["product_id"].unique()

        latest_meta = (
            daily.sort_values("date")
            .groupby("product_id", as_index=False)
            .last()[["product_id", "product_name", "category", "store_id", "selling_price", "current_stock"]]
        )

        grid = pd.MultiIndex.from_product([products, all_dates], names=["product_id", "date"]).to_frame(index=False)
        merged = grid.merge(
            daily[["product_id", "date", "quantity", "revenue", "discount", "observation_status"]],
            on=["product_id", "date"],
            how="left",
        )
        merged = merged.merge(latest_meta, on="product_id", how="left")

        missing_gap_mask = merged["observation_status"].isna()
        missing_calendar_days = int(missing_gap_mask.sum())
        merged["observation_status"] = merged["observation_status"].fillna("missing_calendar_gap")

        # Explicit calendar gap policy: preserve non-negative numeric series for time-series models
        # while flagging missing_calendar_gap rows in observation_status and metadata.
        merged["quantity"] = merged["quantity"].fillna(0.0).astype(float)
        merged["revenue"] = merged["revenue"].fillna(0.0).astype(float)
        merged["discount"] = merged["discount"].fillna(0.0).astype(float)
        merged["selling_price"] = merged["selling_price"].fillna(18.0).round(2)

        # Fill missing current_stock with realistic baseline if absent
        prod_means = merged.groupby("product_id")["quantity"].transform("mean").clip(lower=0.5)
        rng = np.random.default_rng(42)
        fallback_stock = np.maximum(2, np.round(prod_means * rng.uniform(4.0, 22.0, size=len(merged))))
        merged["current_stock"] = merged["current_stock"].fillna(pd.Series(fallback_stock, index=merged.index))

        merged = merged.sort_values(["product_id", "date"]).reset_index(drop=True)

        processed_path = ""
        if dataset_id:
            out_path = self.processed_dir / f"{dataset_id}_standardized.csv"
            save_cols = UNIVERSAL_SCHEMA_COLUMNS + ["observation_status"]
            merged[save_cols].to_csv(out_path, index=False)
            processed_path = str(out_path)
            logger.info("Saved standardized dataset (%d rows) to %s", len(merged), out_path)

        meta = {
            "num_rows": int(len(merged)),
            "num_skus": int(len(products)),
            "num_days": int(len(all_dates)),
            "date_start": min_date.strftime("%Y-%m-%d"),
            "date_end": max_date.strftime("%Y-%m-%d"),
            "categories": sorted(merged["category"].unique().tolist()),
            "has_real_stock": bool(stock_col is not None),
            "has_real_price": bool(price_col is not None or rev_col is not None),
            "observed_days": int((merged["observation_status"] == "observed").sum()),
            "explicit_zero_days": int((merged["observation_status"] == "zero_sales").sum()),
            "missing_calendar_days": missing_calendar_days,
            "calendar_policy": "explicit_calendar_with_gap_tracking",
            "processed_file_path": processed_path,
        }
        return merged, meta

    @staticmethod
    def to_forecaster_df(standardized_df: pd.DataFrame) -> pd.DataFrame:
        """Adapt Universal Internal Schema DataFrame to the columns expected by ml_engine.forecaster."""
        df = pd.DataFrame({
            "date": pd.to_datetime(standardized_df["date"]),
            "sku": standardized_df["product_id"].astype(str),
            "sales": standardized_df["quantity"].astype(float),
            "product_name": standardized_df["product_name"].astype(str),
            "category": standardized_df["category"].astype(str),
            "store_id": standardized_df["store_id"].astype(str),
            "price": standardized_df["selling_price"].astype(float),
            "current_stock": standardized_df["current_stock"].astype(float),
        })
        return df.sort_values(["sku", "date"]).reset_index(drop=True)

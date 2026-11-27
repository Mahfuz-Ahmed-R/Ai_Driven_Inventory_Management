"""CSV ingestion, flexible column mapping, validation, and sample dataset generator."""

from __future__ import annotations

import io
from datetime import date, timedelta
import numpy as np
import pandas as pd


COLUMN_ALIASES = {
    "date": ["date", "day", "order_date", "sales_date", "timestamp", "ds"],
    "sku": ["sku", "product_id", "item_id", "item", "product", "product_code"],
    "product_name": ["product_name", "name", "item_name", "title", "description"],
    "category": ["category", "cat_id", "dept_id", "department", "cat", "group"],
    "store_id": ["store_id", "store", "warehouse", "location", "branch"],
    "sales": ["sales", "qty", "quantity", "units_sold", "sold", "demand", "y"],
    "current_stock": ["current_stock", "on_hand", "stock", "instock", "inventory", "qty_on_hand"],
    "price": ["price", "unit_price", "sell_price", "selling_price"],
}


def _find_col(columns: list[str], targets: list[str]) -> str | None:
    lower_map = {c.strip().lower(): c for c in columns}
    for t in targets:
        if t in lower_map:
            return lower_map[t]
    return None


def parse_and_validate_csv(file_bytes: bytes) -> tuple[pd.DataFrame, dict]:
    """Parse an uploaded retail sales CSV into a normalized daily DataFrame."""
    try:
        raw = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Could not read CSV file: {exc}") from exc

    if raw.empty:
        raise ValueError("Uploaded CSV file is empty.")

    cols = list(raw.columns)
    date_col = _find_col(cols, COLUMN_ALIASES["date"])
    sku_col = _find_col(cols, COLUMN_ALIASES["sku"])
    sales_col = _find_col(cols, COLUMN_ALIASES["sales"])

    missing = []
    if not date_col:
        missing.append("date (e.g. date, order_date)")
    if not sku_col:
        missing.append("sku / product_id (e.g. sku, product_id, item_id)")
    if not sales_col:
        missing.append("sales / quantity (e.g. sales, qty, units_sold)")
    if missing:
        raise ValueError(
            "Missing required columns: "
            + ", ".join(missing)
            + f". Found columns: {cols}"
        )

    name_col = _find_col(cols, COLUMN_ALIASES["product_name"])
    cat_col = _find_col(cols, COLUMN_ALIASES["category"])
    store_col = _find_col(cols, COLUMN_ALIASES["store_id"])
    stock_col = _find_col(cols, COLUMN_ALIASES["current_stock"])
    price_col = _find_col(cols, COLUMN_ALIASES["price"])

    df = pd.DataFrame()
    df["date"] = pd.to_datetime(raw[date_col], errors="coerce")
    df = df.dropna(subset=["date"]).copy()
    if df.empty:
        raise ValueError(f"Column '{date_col}' contains no valid dates.")

    df["sku"] = raw.loc[df.index, sku_col].astype(str).str.strip()
    df["sales"] = pd.to_numeric(raw.loc[df.index, sales_col], errors="coerce").fillna(0.0).clip(lower=0.0)
    df["product_name"] = (
        raw.loc[df.index, name_col].astype(str).str.strip()
        if name_col
        else df["sku"]
    )
    df["category"] = (
        raw.loc[df.index, cat_col].astype(str).str.strip()
        if cat_col
        else "General"
    )
    df["store_id"] = (
        raw.loc[df.index, store_col].astype(str).str.strip()
        if store_col
        else "MAIN_STORE"
    )
    df["price"] = (
        pd.to_numeric(raw.loc[df.index, price_col], errors="coerce").fillna(18.0).clip(lower=0.5)
        if price_col
        else 18.0
    )

    if stock_col:
        df["current_stock"] = pd.to_numeric(raw.loc[df.index, stock_col], errors="coerce")
    else:
        df["current_stock"] = np.nan

    # Aggregate duplicate date+sku rows and fill missing calendar days with 0 sales
    latest_meta = (
        df.sort_values("date")
        .groupby("sku", as_index=False)
        .last()[["sku", "product_name", "category", "store_id", "price", "current_stock"]]
    )

    daily_sales = df.groupby(["sku", "date"], as_index=False)["sales"].sum()
    min_date = daily_sales["date"].min()
    max_date = daily_sales["date"].max()
    all_dates = pd.date_range(min_date, max_date, freq="D")

    skus = daily_sales["sku"].unique()
    grid = pd.MultiIndex.from_product([skus, all_dates], names=["sku", "date"]).to_frame(index=False)
    normalized = grid.merge(daily_sales, on=["sku", "date"], how="left")
    normalized["sales"] = normalized["sales"].fillna(0.0)
    normalized = normalized.merge(latest_meta, on="sku", how="left")

    # Fill missing current_stock with realistic baseline (~10 days of mean demand)
    sku_means = normalized.groupby("sku")["sales"].transform("mean").clip(lower=0.5)
    rng = np.random.default_rng(42)
    fallback_stock = np.maximum(2, np.round(sku_means * rng.uniform(4.0, 22.0, size=len(normalized))))
    normalized["current_stock"] = normalized["current_stock"].fillna(pd.Series(fallback_stock, index=normalized.index))
    normalized = normalized.sort_values(["sku", "date"]).reset_index(drop=True)

    meta = {
        "num_rows": int(len(normalized)),
        "num_skus": int(len(skus)),
        "num_days": int(len(all_dates)),
        "date_start": min_date.strftime("%Y-%m-%d"),
        "date_end": max_date.strftime("%Y-%m-%d"),
        "categories": sorted(normalized["category"].unique().tolist()),
        "has_real_stock": bool(stock_col is not None),
    }
    return normalized, meta


def generate_sample_csv_bytes() -> bytes:
    """Generate a realistic 120-day, 15-SKU retail CSV for instant testing."""
    rng = np.random.default_rng(42)
    end_dt = date.today() - timedelta(days=1)
    start_dt = end_dt - timedelta(days=119)
    dates = pd.date_range(start_dt, end_dt, freq="D")

    catalog = [
        ("SKU-101", "Wireless Earbuds Pro", "Electronics", 59.99, 14.0, 28),
        ("SKU-102", "USB-C Fast Charger 65W", "Electronics", 29.99, 19.0, 35),
        ("SKU-103", "Smart Watch Band", "Electronics", 19.50, 9.5, 95),
        ("SKU-104", "Mechanical Keyboard", "Electronics", 89.00, 6.2, 18),
        ("SKU-105", "Laptop Stand Aluminum", "Electronics", 34.00, 7.8, 120),
        ("SKU-201", "Organic Arabica Coffee 1kg", "Foods", 22.00, 24.0, 42),
        ("SKU-202", "Matcha Green Tea Tin", "Foods", 16.50, 11.0, 140),
        ("SKU-203", "Artisan Olive Oil 500ml", "Foods", 18.00, 8.4, 22),
        ("SKU-204", "Protein Energy Bar Box", "Foods", 24.99, 16.5, 65),
        ("SKU-205", "Sparkling Mineral Water 12pk", "Foods", 12.00, 28.0, 50),
        ("SKU-301", "Insulated Steel Tumbler", "Household", 27.50, 12.0, 190),
        ("SKU-302", "HEPA Air Purifier Filter", "Household", 39.00, 5.5, 16),
        ("SKU-303", "Bamboo Desk Organizer", "Household", 21.00, 6.8, 85),
        ("SKU-304", "LED Smart Desk Lamp", "Household", 44.00, 8.2, 24),
        ("SKU-305", "Microfiber Cleaning Kit", "Household", 14.50, 15.0, 210),
    ]

    rows = []
    for sku, name, cat, price, base_demand, end_stock in catalog:
        for i, dt in enumerate(dates):
            wday_boost = 1.32 if dt.weekday() in (4, 5) else (0.85 if dt.weekday() == 1 else 1.0)
            seasonal = 1.0 + 0.15 * np.sin(2 * np.pi * dt.dayofyear / 365.25)
            trend = 1.0 + 0.0015 * i
            lam = max(0.3, base_demand * wday_boost * seasonal * trend)
            qty = int(rng.poisson(lam))
            rows.append({
                "date": dt.strftime("%Y-%m-%d"),
                "sku": sku,
                "product_name": name,
                "category": cat,
                "store_id": "MAIN_WAREHOUSE",
                "sales": qty,
                "current_stock": end_stock,
                "price": price,
            })

    out = pd.DataFrame(rows)
    return out.to_csv(index=False).encode("utf-8")

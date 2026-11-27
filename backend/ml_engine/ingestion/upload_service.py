"""CSV Upload Service: secure file handling, size limits, encoding detection, and metadata sampling."""

from __future__ import annotations

import io
import logging
import os
import re
from datetime import date, timedelta
from pathlib import Path
import pandas as pd
from django.conf import settings

logger = logging.getLogger(__name__)

MAX_CSV_SIZE_BYTES = int(os.getenv("MAX_CSV_UPLOAD_MB", "200")) * 1024 * 1024  # 200 MB default limit
SAMPLE_ROW_LIMIT = 8


class CSVUploadError(ValueError):
    """Raised when an uploaded file fails security, size, or format checks."""


class CSVUploadService:
    """Handles raw CSV upload validation, immutable storage, and compact metadata extraction."""

    def __init__(self, max_size_bytes: int = MAX_CSV_SIZE_BYTES):
        self.max_size_bytes = max_size_bytes
        self.raw_dir = Path(settings.MEDIA_ROOT) / "uploads" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        base = Path(filename or "uploaded.csv").name
        cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", base)
        return cleaned[:120] or "uploaded.csv"

    def validate_and_store_raw(self, dataset_id: str, filename: str, file_bytes: bytes) -> dict:
        """Validate file extension, size, and encoding, then persist the original file unchanged."""
        safe_name = self.sanitize_filename(filename)
        if not safe_name.lower().endswith(".csv"):
            raise CSVUploadError("Unsupported file format. Only .csv files are accepted.")

        if not file_bytes:
            raise CSVUploadError("Uploaded CSV file is empty (0 bytes).")

        if len(file_bytes) > self.max_size_bytes:
            mb = self.max_size_bytes / (1024 * 1024)
            raise CSVUploadError(f"File exceeds maximum allowed size of {mb:.0f} MB.")

        raw_df = self._read_csv_bytes(file_bytes)
        if len(raw_df.columns) == 0:
            raise CSVUploadError("CSV file contains no header columns.")

        raw_path = self.raw_dir / f"{dataset_id}_{safe_name}"
        raw_path.write_bytes(file_bytes)
        logger.info("Stored raw CSV %s (%d bytes, %d rows) at %s", safe_name, len(file_bytes), len(raw_df), raw_path)

        working_df, wide_info = self.maybe_reshape_wide_sales(raw_df)
        metadata = self.extract_compact_profile(working_df)
        if wide_info:
            metadata["wide_format"] = wide_info
        return {
            "raw_file_path": str(raw_path),
            "safe_filename": safe_name,
            "file_size_bytes": len(file_bytes),
            "raw_df": working_df,
            "profile": metadata,
        }

    @staticmethod
    def _read_csv_bytes(file_bytes: bytes) -> pd.DataFrame:
        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                return pd.read_csv(io.BytesIO(file_bytes), encoding=encoding, keep_default_na=True)
            except UnicodeDecodeError:
                continue
            except Exception as exc:
                raise CSVUploadError(f"Could not parse CSV file: {exc}") from exc
        raise CSVUploadError("Could not decode CSV file with UTF-8 or Latin-1 encoding.")

    @staticmethod
    def maybe_reshape_wide_sales(df: pd.DataFrame) -> tuple[pd.DataFrame, dict | None]:
        """
        Detect wide-format daily sales matrices (such as M5 d_1..d_1913 or YYYY-MM-DD columns)
        and melt them into tidy long format (date, quantity) without mutating the original file.
        """
        cols = [str(c) for c in df.columns]
        m5_day_cols = [c for c in cols if re.match(r"^d_\d+$", c.strip(), flags=re.IGNORECASE)]
        iso_day_cols = [c for c in cols if re.match(r"^\d{4}-\d{2}-\d{2}$", c.strip())]

        day_cols = m5_day_cols if len(m5_day_cols) >= 7 else (iso_day_cols if len(iso_day_cols) >= 7 else [])
        if not day_cols:
            return df, None

        is_m5 = day_cols is m5_day_cols
        id_vars = [c for c in cols if c not in set(day_cols)]
        if not id_vars:
            return df, None

        work = df
        sampled_series = False
        trimmed_days = False

        # Keep memory bounded for massive wide matrices like full M5 (30,490 x 1,913)
        if len(work) * len(day_cols) > 300_000:
            if len(work) > 200:
                work = work.sample(n=200, random_state=42)
                sampled_series = True
            if len(day_cols) > 365:
                day_cols = day_cols[-365:]
                trimmed_days = True

        melted = work[id_vars + day_cols].melt(
            id_vars=id_vars,
            value_vars=day_cols,
            var_name="_day_col",
            value_name="quantity",
        )

        if is_m5:
            m5_origin = date(2011, 1, 29)
            day_nums = melted["_day_col"].str.extract(r"(\d+)")[0].astype(int)
            melted["date"] = day_nums.map(lambda k: (m5_origin + timedelta(days=int(k) - 1)).isoformat())
        else:
            melted["date"] = melted["_day_col"].astype(str)

        melted = melted.drop(columns=["_day_col"])
        # If M5 has both `id` and `item_id`, prefer `item_id` or `id` cleanly
        note_parts = [f"Reshaped wide sales matrix ({len(day_cols)} day columns) into daily rows."]
        if sampled_series:
            note_parts.append("Sampled 200 series (seed=42) for fast processing.")
        if trimmed_days:
            note_parts.append("Used the most recent 365 days.")

        info = {
            "detected": True,
            "format": "m5_wide" if is_m5 else "iso_date_wide",
            "day_columns_count": len(m5_day_cols) if is_m5 else len(iso_day_cols),
            "note": " ".join(note_parts),
        }
        return melted, info

    @staticmethod
    def read_raw_from_path(raw_path: str) -> pd.DataFrame:
        path = Path(raw_path)
        if not path.exists():
            raise CSVUploadError("Original uploaded CSV file is no longer available on disk.")
        raw_df = CSVUploadService._read_csv_bytes(path.read_bytes())
        working_df, _ = CSVUploadService.maybe_reshape_wide_sales(raw_df)
        return working_df

    @staticmethod
    def extract_compact_profile(df: pd.DataFrame, sample_rows: int = SAMPLE_ROW_LIMIT) -> dict:
        """Extract only headers, dtypes, null counts, and a small sample—never the full CSV."""
        headers = [str(c) for c in df.columns.tolist()]
        sample_df = df.head(sample_rows).copy()

        # Convert sample values to JSON-safe strings/primitives
        preview_rows = []
        for _, row in sample_df.iterrows():
            record = {}
            for col in headers:
                val = row[col]
                record[col] = None if pd.isna(val) else str(val)[:120]
            preview_rows.append(record)

        column_stats = []
        for col in headers:
            series = df[col]
            non_null = int(series.notna().sum())
            null_count = int(series.isna().sum())
            unique_count = int(series.nunique(dropna=True))
            sample_vals = [str(v)[:60] for v in series.dropna().head(4).tolist()]
            column_stats.append({
                "name": col,
                "inferred_dtype": str(series.dtype),
                "non_null_count": non_null,
                "null_count": null_count,
                "unique_count": unique_count,
                "sample_values": sample_vals,
            })

        return {
            "row_count": int(len(df)),
            "column_count": len(headers),
            "headers": headers,
            "column_stats": column_stats,
            "preview_rows": preview_rows,
        }

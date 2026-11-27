"""Dataset Classification Service: combines Gemini semantic analysis with deterministic backend checks."""

from __future__ import annotations

import logging
import pandas as pd

from .schemas import (
    DatasetClassification,
    GeminiAnalysisResult,
    REQUIRED_STANDARD_FIELDS,
    StandardField,
)

logger = logging.getLogger(__name__)

REJECTION_MESSAGES: dict[DatasetClassification, str] = {
    DatasetClassification.PRODUCT_CATALOG: (
        "This CSV appears to be a Product Catalog (static product metadata without daily/transaction sales history). "
        "Please upload a Sales History CSV containing transaction dates, product IDs, and quantities sold."
    ),
    DatasetClassification.INVENTORY_HISTORY: (
        "This CSV appears to be an Inventory History / Stock Snapshot dataset. "
        "The current forecasting version requires a Sales History CSV with dates, product IDs, and quantities sold."
    ),
    DatasetClassification.PURCHASE_ORDERS: (
        "This CSV appears to be a Purchase Orders dataset. "
        "Please upload a Sales History CSV for demand forecasting."
    ),
    DatasetClassification.SUPPLIER_INFORMATION: (
        "This CSV appears to be Supplier Information master data. "
        "Please upload a Sales History CSV for demand forecasting."
    ),
    DatasetClassification.MARKETING_DATA: (
        "This CSV appears to be Marketing / Campaign data rather than product sales history. "
        "Please upload a Sales History CSV for demand forecasting."
    ),
    DatasetClassification.UNRELATED_DATASET: (
        "Unsupported dataset: this CSV does not contain retail sales data (e.g., it appears to be HR, payroll, "
        "classroom, attendance, or another unrelated domain). Please upload a Sales History CSV."
    ),
    DatasetClassification.AMBIGUOUS_DATASET: (
        "Unable to confidently classify this CSV as Sales History. Please verify that it includes Date, "
        "Product ID / SKU, and Quantity Sold columns, or manually map the required columns below."
    ),
}


class DatasetClassificationService:
    """Enforces deterministic backend validation on top of LLM classification results."""

    CONFIDENCE_THRESHOLD = 0.75

    def evaluate(
        self,
        raw_df: pd.DataFrame,
        llm_result: GeminiAnalysisResult,
    ) -> dict:
        """
        Validate LLM classification against actual column data types in raw_df.
        Never allows the LLM to make the final acceptance decision alone.
        """
        # Build target -> list[source_column] mapping from LLM output
        target_to_sources: dict[str, list[str]] = {}
        mapping_rows = []
        valid_headers = set(str(c) for c in raw_df.columns)

        for item in llm_result.mappings:
            if item.source_column not in valid_headers:
                continue
            t = item.target_field.value
            if t != StandardField.UNMAPPED.value:
                target_to_sources.setdefault(t, []).append(item.source_column)
            mapping_rows.append(item.model_dump())

        # Ensure every header appears in mapping_rows
        mapped_sources = {r["source_column"] for r in mapping_rows}
        for col in raw_df.columns:
            col_str = str(col)
            if col_str not in mapped_sources:
                mapping_rows.append({
                    "source_column": col_str,
                    "target_field": StandardField.UNMAPPED.value,
                    "confidence": 0.0,
                    "reason": "Not mapped by analyzer.",
                    "alternatives": [],
                })

        # Pick best source per target (highest confidence)
        resolved_mapping: dict[str, str] = {}
        conflicts: dict[str, list[str]] = {}
        for target, sources in target_to_sources.items():
            if len(sources) > 1:
                conflicts[target] = sources
            best_row = max(
                (r for r in mapping_rows if r["source_column"] in sources and r["target_field"] == target),
                key=lambda r: r["confidence"],
            )
            resolved_mapping[target] = best_row["source_column"]

        # Deterministic backend verification of required fields
        backend_checks = self._verify_required_columns_in_df(raw_df, resolved_mapping)
        missing_required = [f for f in REQUIRED_STANDARD_FIELDS if f not in resolved_mapping]

        classification = llm_result.classification
        accepted = classification == DatasetClassification.SALES_HISTORY
        rejection_reason = ""

        if classification != DatasetClassification.SALES_HISTORY:
            accepted = False
            rejection_reason = REJECTION_MESSAGES.get(
                classification,
                "Only Sales History datasets are supported in this version.",
            )
            if llm_result.classification_reason:
                rejection_reason = f"{rejection_reason} Details: {llm_result.classification_reason}"
        elif missing_required:
            # Allow user to fix mapping if columns exist but weren't mapped confidently
            if len(raw_df.columns) >= 3:
                classification = DatasetClassification.AMBIGUOUS_DATASET
                accepted = False
                rejection_reason = (
                    f"Missing required sales columns: {', '.join(missing_required)}. "
                    "Please map them manually below if they exist under different names."
                )
            else:
                accepted = False
                rejection_reason = "CSV has fewer than 3 columns and cannot contain Date, Product ID, and Quantity."
        elif not backend_checks["date_valid"] or not backend_checks["quantity_valid"]:
            accepted = False
            classification = DatasetClassification.AMBIGUOUS_DATASET
            reasons = []
            if not backend_checks["date_valid"]:
                reasons.append(f"mapped date column '{resolved_mapping.get('date')}' has <50% valid dates")
            if not backend_checks["quantity_valid"]:
                reasons.append(f"mapped quantity column '{resolved_mapping.get('quantity')}' has <50% numeric values")
            rejection_reason = (
                "Backend verification failed for Sales History: " + "; ".join(reasons) + ". "
                "Please review and correct the column mapping."
            )

        low_confidence_cols = [
            r["source_column"]
            for r in mapping_rows
            if r["target_field"] != StandardField.UNMAPPED.value and r["confidence"] < self.CONFIDENCE_THRESHOLD
        ]
        needs_confirmation = bool(
            llm_result.needs_user_confirmation
            or low_confidence_cols
            or conflicts
            or missing_required
            or not accepted
        )

        return {
            "classification": classification.value,
            "classification_confidence": round(float(llm_result.classification_confidence), 3),
            "classification_reason": llm_result.classification_reason,
            "accepted": accepted,
            "rejection_reason": rejection_reason,
            "needs_user_confirmation": needs_confirmation,
            "mappings": mapping_rows,
            "resolved_mapping": resolved_mapping,
            "mapping_conflicts": conflicts,
            "low_confidence_columns": low_confidence_cols,
            "missing_required_fields": missing_required,
            "data_quality_issues": llm_result.data_quality_issues,
            "backend_checks": backend_checks,
        }

    @staticmethod
    def _verify_required_columns_in_df(raw_df: pd.DataFrame, resolved_mapping: dict[str, str]) -> dict:
        sample = raw_df.head(200)
        date_valid = False
        qty_valid = False
        pid_valid = False

        date_col = resolved_mapping.get(StandardField.DATE.value)
        if date_col and date_col in sample.columns:
            parsed_dates = pd.to_datetime(sample[date_col], errors="coerce")
            non_empty = sample[date_col].notna().sum()
            date_valid = non_empty > 0 and (parsed_dates.notna().sum() / max(1, non_empty)) >= 0.5

        qty_col = resolved_mapping.get(StandardField.QUANTITY.value)
        if qty_col and qty_col in sample.columns:
            parsed_qty = pd.to_numeric(sample[qty_col], errors="coerce")
            non_empty = sample[qty_col].notna().sum()
            qty_valid = non_empty > 0 and (parsed_qty.notna().sum() / max(1, non_empty)) >= 0.5

        pid_col = resolved_mapping.get(StandardField.PRODUCT_ID.value)
        if pid_col and pid_col in sample.columns:
            non_empty = sample[pid_col].dropna().astype(str).str.strip()
            pid_valid = (non_empty != "").sum() > 0

        return {
            "date_valid": bool(date_valid),
            "quantity_valid": bool(qty_valid),
            "product_id_valid": bool(pid_valid),
        }

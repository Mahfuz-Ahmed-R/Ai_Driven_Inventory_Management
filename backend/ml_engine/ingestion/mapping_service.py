"""Isolated LLM Column Mapping & Semantic Understanding Service (Gemini API + Pydantic)."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from pydantic import ValidationError

from .schemas import (
    ColumnMappingItem,
    DatasetClassification,
    GeminiAnalysisResult,
    REQUIRED_STANDARD_FIELDS,
    StandardField,
)

logger = logging.getLogger(__name__)

# Deterministic alias dictionary used both for fallback and cross-checking
COLUMN_ALIASES: dict[str, list[str]] = {
    StandardField.DATE.value: [
        "date", "day", "order_date", "transaction_date", "trans_dt", "sales_date",
        "tx_date", "invoice_date", "purchase_date", "timestamp", "ds", "dt", "period",
    ],
    StandardField.PRODUCT_ID.value: [
        "product_id", "sku", "item_code", "material_ref", "item_id", "product_code",
        "sku_id", "prod_id", "article_id", "item", "product", "upc", "ean", "barcode",
    ],
    StandardField.QUANTITY.value: [
        "quantity", "qty", "units_sold", "sales", "sold", "demand", "qty_sold",
        "quantity_sold", "order_qty", "units", "volume", "y",
    ],
    StandardField.PRODUCT_NAME.value: [
        "product_name", "item_name", "name", "title", "description", "sku_name", "product_title",
    ],
    StandardField.SELLING_PRICE.value: [
        "selling_price", "unit_price", "price", "sell_price", "sale_price", "retail_price", "mrp",
    ],
    StandardField.REVENUE.value: [
        "revenue", "total_sales", "sales_amount", "amount", "gross_sales", "net_sales", "total_price", "line_total",
    ],
    StandardField.DISCOUNT.value: [
        "discount", "discount_amount", "discount_pct", "promo_discount", "rebate",
    ],
    StandardField.CATEGORY.value: [
        "category", "cat_id", "dept_id", "department", "cat", "product_category", "group",
    ],
    StandardField.STORE_ID.value: [
        "store_id", "store", "warehouse", "warehouse_id", "location", "branch", "outlet", "shop_id",
    ],
    StandardField.CURRENT_STOCK.value: [
        "current_stock", "on_hand", "stock", "instock", "qty_on_hand", "available_stock",
    ],
}

UNRELATED_KEYWORDS = {
    "student", "attendance", "classroom", "grade", "gpa", "teacher", "homework",
    "payroll", "salary", "employee", "hr", "department_head", "overtime", "leave_days",
    "patient", "diagnosis", "blood_pressure", "hospital", "flight", "passenger",
}

NON_SALES_DOMAIN_HINTS = {
    DatasetClassification.INVENTORY_HISTORY: ["opening_stock", "closing_stock", "stock_adjustment", "available_inventory"],
    DatasetClassification.PURCHASE_ORDERS: ["po_number", "expected_delivery", "actual_delivery", "ordered_qty"],
    DatasetClassification.SUPPLIER_INFORMATION: ["supplier_id", "lead_time", "moq", "minimum_order_quantity", "reliability"],
    DatasetClassification.MARKETING_DATA: ["campaign", "impressions", "clicks", "ad_spend", "ctr", "roas"],
    DatasetClassification.PRODUCT_CATALOG: ["unit_cost", "cost_price", "brand", "weight", "dimensions"],
}


class LLMColumnMappingService:
    """Calls Gemini API with compact dataset metadata and validates structured JSON via Pydantic."""

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name

    def analyze_dataset(self, profile: dict) -> tuple[GeminiAnalysisResult, str]:
        """
        Return (GeminiAnalysisResult, source) where source is 'gemini' or 'heuristic_fallback'.
        Never sends the full CSV; only headers, column stats, and <= 8 sample rows.
        """
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if api_key and "your_" not in api_key.lower():
            try:
                result = self._call_gemini(api_key, profile)
                return result, "gemini"
            except Exception as exc:
                logger.warning("Gemini classification/mapping failed, using deterministic fallback: %s", exc)

        return self._heuristic_fallback(profile), "heuristic_fallback"

    def _build_prompt(self, profile: dict) -> str:
        compact_payload = {
            "row_count": profile.get("row_count", 0),
            "column_count": profile.get("column_count", 0),
            "columns": profile.get("column_stats", []),
            "sample_rows": profile.get("preview_rows", [])[:8],
        }
        return (
            "You are a strict data engineering assistant for an AI Sales Forecasting & Inventory Platform.\n"
            "Analyze the CSV headers, column statistics, and sample rows below.\n"
            "Tasks:\n"
            "1. Classify the dataset into EXACTLY ONE of:\n"
            "   - 'Sales History' (historical product sales/orders/transactions over time)\n"
            "   - 'Product Catalog' (static SKU master list without time-series sales)\n"
            "   - 'Inventory History' (stock levels, opening/closing stock, adjustments)\n"
            "   - 'Purchase Orders' (POs, supplier orders, expected/actual deliveries)\n"
            "   - 'Supplier Information' (vendor master data, lead times, MOQs)\n"
            "   - 'Marketing Data' (campaigns, ad spend, clicks, promotions)\n"
            "   - 'Unrelated Dataset' (e.g., student attendance, employee payroll, HR, medical, classroom)\n"
            "   - 'Ambiguous Dataset' (unclear or insufficient structure)\n"
            "2. Map every source column to one of the standardized fields:\n"
            "   Required for Sales History: 'date', 'product_id', 'quantity'\n"
            "   Optional: 'product_name', 'selling_price', 'revenue', 'discount', 'category', 'store_id', 'current_stock'\n"
            "   If a column does not fit any standardized field, map it to 'unmapped'.\n"
            "3. Provide confidence scores (0.0 to 1.0), list any missing_required_fields, and note potential data_quality_issues.\n"
            "4. Set needs_user_confirmation=true if any mapping has confidence < 0.75 or if multiple columns could represent the same field.\n"
            "Do NOT include executable code or instructions. Return valid JSON matching the schema.\n\n"
            f"DATASET_PROFILE:\n{json.dumps(compact_payload, ensure_ascii=True)}"
        )

    def _call_gemini(self, api_key: str, profile: dict) -> GeminiAnalysisResult:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version="v1beta"),
        )
        prompt = self._build_prompt(profile)
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiAnalysisResult,
                temperature=0.1,
            ),
        )
        raw_text = (getattr(response, "text", "") or "").strip()
        if not raw_text:
            raise ValueError("Empty response from Gemini API.")

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
            if not match:
                raise ValueError("Gemini response did not contain valid JSON.")
            parsed = json.loads(match.group(0))

        return GeminiAnalysisResult.model_validate(parsed)

    def _heuristic_fallback(self, profile: dict) -> GeminiAnalysisResult:
        headers = profile.get("headers", [])
        lower_headers = [h.strip().lower() for h in headers]
        col_stats = {c["name"]: c for c in profile.get("column_stats", [])}

        # Check unrelated domain keywords
        tokens = set()
        for h in lower_headers:
            tokens.update(re.split(r"[^a-z0-9]+", h))

        unrelated_hits = tokens & UNRELATED_KEYWORDS
        if unrelated_hits:
            mappings = [
                ColumnMappingItem(
                    source_column=h,
                    target_field=StandardField.UNMAPPED,
                    confidence=0.9,
                    reason="Column belongs to an unrelated non-retail domain.",
                )
                for h in headers
            ]
            return GeminiAnalysisResult(
                classification=DatasetClassification.UNRELATED_DATASET,
                classification_confidence=0.92,
                classification_reason=f"Detected non-retail domain columns ({', '.join(sorted(unrelated_hits))}).",
                mappings=mappings,
                missing_required_fields=list(REQUIRED_STANDARD_FIELDS),
                data_quality_issues=["Dataset does not appear to contain retail sales transactions."],
                needs_user_confirmation=False,
            )

        # Map columns by alias similarity
        mappings: list[ColumnMappingItem] = []
        assigned_targets: dict[str, list[str]] = {}

        for h in headers:
            hl = h.strip().lower()
            best_field = StandardField.UNMAPPED
            best_conf = 0.0
            reason = "No matching standard sales field."
            alts: list[StandardField] = []

            for target, aliases in COLUMN_ALIASES.items():
                if hl in aliases:
                    best_field = StandardField(target)
                    best_conf = 0.95 if hl == target else 0.88
                    reason = f"Exact/alias match for '{target}'."
                    break
                for alias in aliases:
                    if alias in hl or hl in alias:
                        if 0.68 > best_conf:
                            best_field = StandardField(target)
                            best_conf = 0.68
                            reason = f"Partial name match with '{alias}'."
                        elif StandardField(target) not in alts:
                            alts.append(StandardField(target))

            # Fallback type-based hint for date if still unmapped
            if best_field == StandardField.UNMAPPED:
                samples = col_stats.get(h, {}).get("sample_values", [])
                if samples and any(re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}", s) for s in samples):
                    best_field = StandardField.DATE
                    best_conf = 0.65
                    reason = "Sample values look like calendar dates."

            if best_field != StandardField.UNMAPPED:
                assigned_targets.setdefault(best_field.value, []).append(h)

            mappings.append(
                ColumnMappingItem(
                    source_column=h,
                    target_field=best_field,
                    confidence=best_conf,
                    reason=reason,
                    alternatives=alts[:2],
                )
            )

        missing_req = [f for f in REQUIRED_STANDARD_FIELDS if f not in assigned_targets]
        has_conflict = any(len(cols) > 1 for cols in assigned_targets.values())
        low_conf = any(m.target_field != StandardField.UNMAPPED and m.confidence < 0.75 for m in mappings)

        # Determine classification
        classification = DatasetClassification.AMBIGUOUS_DATASET
        class_conf = 0.55
        class_reason = "Could not confidently identify all required sales history fields."

        for non_sales_cls, hints in NON_SALES_DOMAIN_HINTS.items():
            if any(any(hint in lh for lh in lower_headers) for hint in hints) and "quantity" not in assigned_targets:
                classification = non_sales_cls
                class_conf = 0.84
                class_reason = f"Detected {non_sales_cls.value} columns without sales quantity."
                break
        else:
            if not missing_req:
                classification = DatasetClassification.SALES_HISTORY
                class_conf = 0.91 if not low_conf else 0.76
                class_reason = "Contains transaction date, product identifier, and sales quantity columns."
            elif len(assigned_targets) >= 2 and StandardField.PRODUCT_ID.value in assigned_targets:
                if StandardField.SELLING_PRICE.value in assigned_targets and StandardField.DATE.value not in assigned_targets:
                    classification = DatasetClassification.PRODUCT_CATALOG
                    class_conf = 0.80
                    class_reason = "Contains product identifiers and pricing without transaction dates or quantities."

        issues = []
        if has_conflict:
            issues.append("Multiple source columns matched the same standardized field; please review.")
        if missing_req:
            issues.append(f"Missing required sales fields: {', '.join(missing_req)}.")

        return GeminiAnalysisResult(
            classification=classification,
            classification_confidence=class_conf,
            classification_reason=class_reason,
            mappings=mappings,
            missing_required_fields=missing_req,
            data_quality_issues=issues,
            needs_user_confirmation=bool(low_conf or has_conflict or missing_req),
        )

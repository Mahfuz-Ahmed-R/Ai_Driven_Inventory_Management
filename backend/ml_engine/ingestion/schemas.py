"""Pydantic schemas for CSV classification, LLM column mapping, and validation reports."""

from __future__ import annotations

from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class DatasetClassification(str, Enum):
    SALES_HISTORY = "Sales History"
    PRODUCT_CATALOG = "Product Catalog"
    INVENTORY_HISTORY = "Inventory History"
    PURCHASE_ORDERS = "Purchase Orders"
    SUPPLIER_INFORMATION = "Supplier Information"
    MARKETING_DATA = "Marketing Data"
    UNRELATED_DATASET = "Unrelated Dataset"
    AMBIGUOUS_DATASET = "Ambiguous Dataset"


class StandardField(str, Enum):
    DATE = "date"
    PRODUCT_ID = "product_id"
    QUANTITY = "quantity"
    PRODUCT_NAME = "product_name"
    SELLING_PRICE = "selling_price"
    REVENUE = "revenue"
    DISCOUNT = "discount"
    CATEGORY = "category"
    STORE_ID = "store_id"
    CURRENT_STOCK = "current_stock"
    UNMAPPED = "unmapped"


REQUIRED_STANDARD_FIELDS = [
    StandardField.DATE.value,
    StandardField.PRODUCT_ID.value,
    StandardField.QUANTITY.value,
]

OPTIONAL_STANDARD_FIELDS = [
    StandardField.PRODUCT_NAME.value,
    StandardField.SELLING_PRICE.value,
    StandardField.REVENUE.value,
    StandardField.DISCOUNT.value,
    StandardField.CATEGORY.value,
    StandardField.STORE_ID.value,
    StandardField.CURRENT_STOCK.value,
]


class ColumnMappingItem(BaseModel):
    source_column: str = Field(..., min_length=1, max_length=200)
    target_field: StandardField = Field(default=StandardField.UNMAPPED)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    reason: str = Field(default="", max_length=300)
    alternatives: list[StandardField] = Field(default_factory=list)

    @field_validator("source_column", "reason", mode="before")
    @classmethod
    def _sanitize_text(cls, v):
        if v is None:
            return ""
        return str(v).strip()[:300]


class GeminiAnalysisResult(BaseModel):
    classification: DatasetClassification
    classification_confidence: float = Field(..., ge=0.0, le=1.0)
    classification_reason: str = Field(..., min_length=1, max_length=500)
    mappings: list[ColumnMappingItem] = Field(default_factory=list)
    missing_required_fields: list[str] = Field(default_factory=list)
    data_quality_issues: list[str] = Field(default_factory=list)
    needs_user_confirmation: bool = Field(default=False)

    @field_validator("classification_reason", mode="before")
    @classmethod
    def _clean_reason(cls, v):
        return str(v or "").strip()[:500]

    @field_validator("data_quality_issues", mode="before")
    @classmethod
    def _clean_issues(cls, v):
        if not isinstance(v, list):
            return []
        return [str(item).strip()[:250] for item in v[:15]]


class ValidationIssue(BaseModel):
    severity: Literal["error", "warning", "info"]
    category: str
    message: str
    count: int = 0
    sample_rows: list[int] = Field(default_factory=list)


class ValidationReport(BaseModel):
    is_valid: bool
    can_proceed: bool
    total_rows: int
    valid_rows: int
    invalid_records_count: int = 0
    empty_rows_count: int = 0
    duplicate_records_count: int = 0
    valid_zero_sales_count: int = 0
    potential_stockout_observations_count: int = 0
    outlier_count: int = 0
    missing_values_summary: dict[str, int] = Field(default_factory=dict)
    date_range: dict[str, str] = Field(default_factory=dict)
    num_products: int = 0
    num_days: int = 0
    issues: list[ValidationIssue] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

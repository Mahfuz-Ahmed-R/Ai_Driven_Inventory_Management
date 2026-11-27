"""Python Data Validation Service: thorough quality audit without silently dropping records."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .schemas import REQUIRED_STANDARD_FIELDS, StandardField, ValidationIssue, ValidationReport


class DataValidationService:
    """Validates a mapped raw CSV and produces a structured ValidationReport."""

    MIN_RECOMMENDED_DAYS = 35
    MIN_VIABLE_DAYS = 7

    def validate(self, raw_df: pd.DataFrame, resolved_mapping: dict[str, str]) -> ValidationReport:
        issues: list[ValidationIssue] = []
        recommendations: list[str] = []
        total_rows = int(len(raw_df))

        # 1. Missing required columns
        missing_req = [f for f in REQUIRED_STANDARD_FIELDS if f not in resolved_mapping or resolved_mapping[f] not in raw_df.columns]
        if missing_req:
            issues.append(ValidationIssue(
                severity="error",
                category="missing_required_columns",
                message=f"Required fields are not mapped to valid CSV columns: {', '.join(missing_req)}.",
                count=len(missing_req),
            ))
            return ValidationReport(
                is_valid=False,
                can_proceed=False,
                total_rows=total_rows,
                valid_rows=0,
                issues=issues,
                recommendations=["Map all required fields (date, product_id, quantity) before running validation."],
            )

        # 2. Empty rows
        empty_mask = raw_df.isna().all(axis=1)
        empty_rows_count = int(empty_mask.sum())
        if empty_rows_count > 0:
            issues.append(ValidationIssue(
                severity="warning",
                category="empty_rows",
                message=f"Found {empty_rows_count} completely empty row(s) that will be excluded during transformation.",
                count=empty_rows_count,
                sample_rows=raw_df.index[empty_mask].tolist()[:10],
            ))

        # 3. Missing values summary across mapped columns
        missing_values_summary: dict[str, int] = {}
        for target_field, src_col in resolved_mapping.items():
            if src_col in raw_df.columns:
                null_cnt = int(raw_df[src_col].isna().sum())
                if null_cnt > 0:
                    missing_values_summary[f"{target_field} ({src_col})"] = null_cnt

        date_col = resolved_mapping[StandardField.DATE.value]
        pid_col = resolved_mapping[StandardField.PRODUCT_ID.value]
        qty_col = resolved_mapping[StandardField.QUANTITY.value]

        # 4. Invalid dates
        parsed_dates = pd.to_datetime(raw_df[date_col], errors="coerce")
        invalid_date_mask = (~empty_mask) & parsed_dates.isna()
        invalid_date_count = int(invalid_date_mask.sum())
        if invalid_date_count > 0:
            issues.append(ValidationIssue(
                severity="error" if invalid_date_count == (total_rows - empty_rows_count) else "warning",
                category="invalid_dates",
                message=f"{invalid_date_count} row(s) have missing or unparseable dates in '{date_col}'.",
                count=invalid_date_count,
                sample_rows=raw_df.index[invalid_date_mask].tolist()[:10],
            ))

        # 5. Missing product identifiers
        pid_series = raw_df[pid_col].astype(str).str.strip()
        missing_pid_mask = (~empty_mask) & (raw_df[pid_col].isna() | (pid_series == "") | (pid_series.str.lower() == "nan"))
        missing_pid_count = int(missing_pid_mask.sum())
        if missing_pid_count > 0:
            issues.append(ValidationIssue(
                severity="error" if missing_pid_count == (total_rows - empty_rows_count) else "warning",
                category="missing_product_id",
                message=f"{missing_pid_count} row(s) are missing a product identifier in '{pid_col}'.",
                count=missing_pid_count,
                sample_rows=raw_df.index[missing_pid_mask].tolist()[:10],
            ))

        # 6. Negative or invalid quantities & inconsistent data types
        parsed_qty = pd.to_numeric(raw_df[qty_col], errors="coerce")
        non_numeric_qty_mask = (~empty_mask) & parsed_qty.isna()
        negative_qty_mask = (~empty_mask) & parsed_qty.notna() & (parsed_qty < 0)
        non_numeric_qty_count = int(non_numeric_qty_mask.sum())
        negative_qty_count = int(negative_qty_mask.sum())

        if non_numeric_qty_count > 0:
            issues.append(ValidationIssue(
                severity="error" if non_numeric_qty_count == (total_rows - empty_rows_count) else "warning",
                category="inconsistent_data_types",
                message=f"{non_numeric_qty_count} row(s) have non-numeric or missing quantity values in '{qty_col}'.",
                count=non_numeric_qty_count,
                sample_rows=raw_df.index[non_numeric_qty_mask].tolist()[:10],
            ))
        if negative_qty_count > 0:
            issues.append(ValidationIssue(
                severity="warning",
                category="negative_quantities",
                message=f"{negative_qty_count} row(s) have negative quantities in '{qty_col}' (possible returns/cancellations). Review before training.",
                count=negative_qty_count,
                sample_rows=raw_df.index[negative_qty_mask].tolist()[:10],
            ))

        # Check numeric consistency for optional numeric fields
        for opt_num in (StandardField.SELLING_PRICE.value, StandardField.REVENUE.value, StandardField.DISCOUNT.value):
            col_name = resolved_mapping.get(opt_num)
            if col_name and col_name in raw_df.columns:
                non_null = raw_df[col_name].notna() & (~empty_mask)
                bad_num = non_null & pd.to_numeric(raw_df[col_name], errors="coerce").isna()
                bad_cnt = int(bad_num.sum())
                if bad_cnt > 0:
                    issues.append(ValidationIssue(
                        severity="warning",
                        category="inconsistent_data_types",
                        message=f"Optional column '{col_name}' ({opt_num}) has {bad_cnt} non-numeric value(s).",
                        count=bad_cnt,
                        sample_rows=raw_df.index[bad_num].tolist()[:10],
                    ))

        # 7. Exact duplicate records
        dup_mask = (~empty_mask) & raw_df.duplicated(keep="first")
        duplicate_records_count = int(dup_mask.sum())
        if duplicate_records_count > 0:
            issues.append(ValidationIssue(
                severity="warning",
                category="duplicate_records",
                message=f"Detected {duplicate_records_count} exact duplicate row(s). They will NOT be silently removed without your confirmation.",
                count=duplicate_records_count,
                sample_rows=raw_df.index[dup_mask].tolist()[:10],
            ))

        # Valid rows subset for deeper time-series diagnostics
        invalid_mask = empty_mask | invalid_date_mask | missing_pid_mask | non_numeric_qty_mask | negative_qty_mask
        invalid_records_count = int((invalid_mask & (~empty_mask)).sum())
        valid_mask = ~invalid_mask
        valid_rows = int(valid_mask.sum())

        valid_zero_sales_count = 0
        potential_stockout_count = 0
        outlier_count = 0
        date_range: dict[str, str] = {}
        num_products = 0
        num_days = 0

        if valid_rows > 0:
            v_df = pd.DataFrame({
                "date": parsed_dates[valid_mask],
                "product_id": pid_series[valid_mask],
                "quantity": parsed_qty[valid_mask].astype(float),
            })

            # Valid zero-sales observations (explicitly recorded 0s)
            valid_zero_sales_count = int((v_df["quantity"] == 0).sum())
            if valid_zero_sales_count > 0:
                issues.append(ValidationIssue(
                    severity="info",
                    category="valid_zero_sales",
                    message=f"Found {valid_zero_sales_count} explicit zero-sales observation(s) (valid 0-unit days).",
                    count=valid_zero_sales_count,
                ))

            # Potential stockout-related observations:
            # 1) Explicit current_stock == 0 if mapped, OR
            # 2) Consecutive >= 3 zero-sales days on a product whose active mean >= 2.0
            stock_col = resolved_mapping.get(StandardField.CURRENT_STOCK.value)
            if stock_col and stock_col in raw_df.columns:
                stock_vals = pd.to_numeric(raw_df.loc[valid_mask, stock_col], errors="coerce")
                zero_stock_obs = int((stock_vals == 0).sum())
                potential_stockout_count += zero_stock_obs

            daily = v_df.groupby(["product_id", "date"], as_index=False)["quantity"].sum().sort_values(["product_id", "date"])
            for _, grp in daily.groupby("product_id"):
                active_vals = grp.loc[grp["quantity"] > 0, "quantity"]
                if len(active_vals) >= 3 and float(active_vals.mean()) >= 2.0:
                    is_zero = (grp["quantity"] == 0).to_numpy()
                    run_len = 0
                    for z in is_zero:
                        if z:
                            run_len += 1
                            if run_len >= 3:
                                potential_stockout_count += 1
                        else:
                            run_len = 0

            if potential_stockout_count > 0:
                issues.append(ValidationIssue(
                    severity="info",
                    category="potential_stockouts",
                    message=(
                        f"Identified {potential_stockout_count} potential stockout-related observation(s) "
                        "(consecutive zero-sales streaks on high-velocity products or zero on-hand stock)."
                    ),
                    count=potential_stockout_count,
                ))

            # Outliers (IQR + upper 4-sigma)
            q1 = float(v_df["quantity"].quantile(0.25))
            q3 = float(v_df["quantity"].quantile(0.75))
            iqr = max(1.0, q3 - q1)
            mean_q = float(v_df["quantity"].mean())
            std_q = float(v_df["quantity"].std()) if len(v_df) > 1 else 0.0
            upper_bound = max(q3 + 3.5 * iqr, mean_q + 4.0 * std_q)
            outlier_mask = v_df["quantity"] > upper_bound
            outlier_count = int(outlier_mask.sum())
            if outlier_count > 0:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="unusual_outliers",
                    message=(
                        f"Detected {outlier_count} unusual quantity outlier(s) above {upper_bound:.1f} units. "
                        "Records are preserved for your review."
                    ),
                    count=outlier_count,
                ))

            min_dt = v_df["date"].min()
            max_dt = v_df["date"].max()
            num_days = int((max_dt - min_dt).days + 1)
            num_products = int(v_df["product_id"].nunique())
            date_range = {
                "start": min_dt.strftime("%Y-%m-%d"),
                "end": max_dt.strftime("%Y-%m-%d"),
            }

            if num_days < self.MIN_VIABLE_DAYS:
                issues.append(ValidationIssue(
                    severity="error",
                    category="insufficient_history",
                    message=f"Only {num_days} day(s) of valid history found. At least {self.MIN_VIABLE_DAYS} days are required.",
                    count=num_days,
                ))
            elif num_days < self.MIN_RECOMMENDED_DAYS:
                issues.append(ValidationIssue(
                    severity="warning",
                    category="insufficient_history",
                    message=(
                        f"Dataset spans {num_days} days (< {self.MIN_RECOMMENDED_DAYS} days recommended for LightGBM lag-28 features). "
                        "Forecasting will use adaptive / seasonal-naive fallback where history is short."
                    ),
                    count=num_days,
                ))
        else:
            issues.append(ValidationIssue(
                severity="error",
                category="no_valid_rows",
                message="Zero valid sales rows remain after checking dates, product IDs, and quantities.",
                count=0,
            ))

        has_blocking_errors = any(i.severity == "error" for i in issues)
        can_proceed = (not has_blocking_errors) and valid_rows > 0

        if not can_proceed:
            recommendations.append("Resolve blocking errors above (or fix column mappings) before running forecasting.")
        else:
            if invalid_records_count > 0:
                recommendations.append(f"{invalid_records_count} invalid row(s) will be flagged/excluded when building the standardized daily table.")
            if duplicate_records_count > 0:
                recommendations.append("Review duplicate records; transaction-level rows on the same date will be summed per product.")
            if not recommendations:
                recommendations.append("Dataset passed all structural and quality checks and is ready for forecasting.")

        return ValidationReport(
            is_valid=not has_blocking_errors,
            can_proceed=can_proceed,
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_records_count=invalid_records_count,
            empty_rows_count=empty_rows_count,
            duplicate_records_count=duplicate_records_count,
            valid_zero_sales_count=valid_zero_sales_count,
            potential_stockout_observations_count=potential_stockout_count,
            outlier_count=outlier_count,
            missing_values_summary=missing_values_summary,
            date_range=date_range,
            num_products=num_products,
            num_days=num_days,
            issues=issues,
            recommendations=recommendations,
        )

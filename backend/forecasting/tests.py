"""Tests for Intelligent CSV Upload, Classification, Mapping, Validation, Transformation & Backtesting."""

from __future__ import annotations

import io
from datetime import date, timedelta
from unittest.mock import patch

import numpy as np
import pandas as pd
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from ml_engine.forecaster import forecast_with_backtest
from forecasting.models import WorkspaceProfile
from ml_engine.ingestion import (
    DataTransformationService,
    DataValidationService,
    DatasetClassification,
)


class IngestionPipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="Password123",
            is_active=True,
        )
        WorkspaceProfile.objects.create(
            key=f"user:{self.user.id}",
            user=self.user,
            referral_code="TEST-REF-001",
            onboarding_completed=True,
        )
        self.client.force_authenticate(user=self.user)

    @patch("ml_engine.ingestion.mapping_service.LLMColumnMappingService._call_gemini", side_effect=RuntimeError("offline test"))
    def test_upload_blocked_until_onboarding_completed(self, _mock_gemini):
        profile = WorkspaceProfile.objects.get(key=f"user:{self.user.id}")
        profile.onboarding_completed = False
        profile.save(update_fields=["onboarding_completed"])

        csv_bytes = b"date,product_id,quantity\n2026-01-01,SKU-1,5\n"
        res_ingest = self.client.post(
            "/api/ingestion/upload/",
            {"file": SimpleUploadedFile("sales.csv", csv_bytes, content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(res_ingest.status_code, 403)
        self.assertEqual(res_ingest.json()["code"], "ONBOARDING_REQUIRED")

        res_legacy = self.client.post(
            "/api/uploads/",
            {"file": SimpleUploadedFile("sales.csv", csv_bytes, content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(res_legacy.status_code, 403)
        self.assertEqual(res_legacy.json()["code"], "ONBOARDING_REQUIRED")

        ob_res = self.client.patch(
            "/api/saas/onboarding/",
            {"step": 3, "data": {"company_name": "TestCo"}, "completed": True},
            format="json",
        )
        self.assertEqual(ob_res.status_code, 200)
        self.assertTrue(ob_res.json()["completed"])

        res_after = self.client.post(
            "/api/ingestion/upload/",
            {"file": SimpleUploadedFile("sales.csv", csv_bytes, content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(res_after.status_code, 201)

    @patch("ml_engine.ingestion.mapping_service.LLMColumnMappingService._call_gemini", side_effect=RuntimeError("offline test"))
    def test_rejects_unrelated_student_attendance_csv(self, _mock_gemini):
        csv_content = (
            "student_id,student_name,attendance_pct,classroom\n"
            "S101,Alice,95,Room-4B\n"
            "S102,Bob,88,Room-4B\n"
        ).encode("utf-8")
        uploaded = SimpleUploadedFile("attendance.csv", csv_content, content_type="text/csv")
        res = self.client.post("/api/ingestion/upload/", {"file": uploaded}, format="multipart")
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["classification"], DatasetClassification.UNRELATED_DATASET.value)
        self.assertFalse(data["classification_result"]["accepted"])
        self.assertEqual(data["status"], "rejected")

    @patch("ml_engine.ingestion.mapping_service.LLMColumnMappingService._call_gemini", side_effect=RuntimeError("offline test"))
    def test_accepts_unfamiliar_sales_columns_and_revalidates(self, _mock_gemini):
        rows = ["trans_dt,sku,qty,unit_price"]
        start = date(2026, 1, 1)
        for i in range(45):
            dt = (start + timedelta(days=i)).isoformat()
            rows.append(f"{dt},SKU-A,{10 + (i % 5)},24.50")
            rows.append(f"{dt},SKU-B,{0 if i in (10, 11, 12) else 5},12.00")
        csv_bytes = "\n".join(rows).encode("utf-8")
        uploaded = SimpleUploadedFile("partner_sales.csv", csv_bytes, content_type="text/csv")

        res = self.client.post("/api/ingestion/upload/", {"file": uploaded, "company_name": "TestCo"}, format="multipart")
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["classification"], DatasetClassification.SALES_HISTORY.value)
        self.assertTrue(data["classification_result"]["accepted"])
        self.assertEqual(data["column_mapping"]["date"], "trans_dt")
        self.assertEqual(data["column_mapping"]["product_id"], "sku")
        self.assertEqual(data["column_mapping"]["quantity"], "qty")
        self.assertEqual(data["column_mapping"]["selling_price"], "unit_price")
        self.assertTrue(data["validation_report"]["can_proceed"])
        self.assertGreaterEqual(data["validation_report"]["valid_zero_sales_count"], 3)
        self.assertTrue(len(data["standardized_preview"]) > 0)

        # Re-validate endpoint
        reval = self.client.post(
            f"/api/ingestion/{data['dataset_id']}/validate/",
            {"column_mapping": data["column_mapping"]},
            format="json",
        )
        self.assertEqual(reval.status_code, 200)
        self.assertTrue(reval.json()["validation_report"]["can_proceed"])

    def test_validation_distinguishes_invalid_zeros_stockouts_and_duplicates(self):
        df = pd.DataFrame({
            "d": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07", "bad-date", "2026-01-01"],
            "p": ["A", "A", "A", "A", "A", "A", "A", "A", "A"],
            "q": [10, 12, 0, 0, 0, 8, -2, 5, 10],
        })
        mapping = {"date": "d", "product_id": "p", "quantity": "q"}
        report = DataValidationService().validate(df, mapping)
        self.assertEqual(report.invalid_records_count, 2)  # bad-date and -2
        self.assertEqual(report.duplicate_records_count, 1)  # 2026-01-01, A, 10
        self.assertEqual(report.valid_zero_sales_count, 3)
        self.assertGreaterEqual(report.potential_stockout_observations_count, 1)

    def test_transformation_tracks_calendar_gaps_explicitly(self):
        raw_df = pd.DataFrame({
            "trans_dt": ["2026-01-01", "2026-01-01", "2026-01-04"],
            "sku": ["P1", "P1", "P1"],
            "qty": [3, 2, 7],
        })
        mapping = {"date": "trans_dt", "product_id": "sku", "quantity": "qty"}
        std_df, meta = DataTransformationService().transform(raw_df, mapping)
        self.assertEqual(meta["num_days"], 4)
        self.assertEqual(meta["observed_days"], 2)
        self.assertEqual(meta["missing_calendar_days"], 2)
        day1_qty = std_df.loc[std_df["date"] == "2026-01-01", "quantity"].iloc[0]
        self.assertEqual(day1_qty, 5.0)

    def test_forecaster_chronological_backtest_selects_model(self):
        dates = pd.date_range("2026-01-01", periods=60, freq="D")
        rows = []
        rng = np.random.default_rng(7)
        for sku in ("SKU-1", "SKU-2"):
            for i, d in enumerate(dates):
                rows.append({
                    "date": d,
                    "sku": sku,
                    "sales": float(10 + (i % 7) + int(rng.integers(0, 3))),
                    "product_name": sku,
                    "category": "General",
                    "store_id": "MAIN",
                    "price": 20.0,
                    "current_stock": 50.0,
                })
        df = pd.DataFrame(rows)
        forecasts, backtest = forecast_with_backtest(df, horizon=28)
        self.assertTrue(backtest["evaluated"])
        self.assertIn(backtest["selected_model"], ("LightGBM (Tweedie)", "Seasonal-Naive (Lag-7)"))
        self.assertEqual(len(forecasts["SKU-1"]["forecast_sales"]), 28)

    @patch("ml_engine.ingestion.mapping_service.LLMColumnMappingService._call_gemini", side_effect=RuntimeError("offline test"))
    def test_accepts_m5_wide_format_csv(self, _mock_gemini):
        day_cols = [f"d_{i}" for i in range(1, 16)]
        header = "id,item_id,dept_id,cat_id,store_id," + ",".join(day_cols)
        row1 = "FOODS_1_001_CA_1,FOODS_1_001,FOODS_1,FOODS,CA_1," + ",".join(["3"] * 15)
        row2 = "HOBBIES_1_001_CA_1,HOBBIES_1_001,HOBBIES_1,HOBBIES,CA_1," + ",".join(["2"] * 15)
        csv_bytes = "\n".join([header, row1, row2]).encode("utf-8")
        uploaded = SimpleUploadedFile("m5_sample.csv", csv_bytes, content_type="text/csv")

        res = self.client.post("/api/ingestion/upload/", {"file": uploaded}, format="multipart")
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["classification"], DatasetClassification.SALES_HISTORY.value)
        self.assertTrue(data["classification_result"]["accepted"])
        self.assertTrue(data["validation_report"]["can_proceed"])
        self.assertEqual(data["profile"]["wide_format"]["format"], "m5_wide")


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_validation_rejects_weak_inputs(self):
        res = self.client.post(
            "/api/auth/register/",
            {"name": "A", "email": "not-an-email", "password": "short"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        body = res.json()
        self.assertIn("field_errors", body)
        self.assertIn("name", body["field_errors"])
        self.assertIn("email", body["field_errors"])
        self.assertIn("password", body["field_errors"])

    def test_register_verify_otp_login_and_refresh_flow(self):
        with self.settings(DEBUG=True):
            reg = self.client.post(
                "/api/auth/register/",
                {"name": "Jane Doe", "email": "jane@example.com", "password": "Password123"},
                format="json",
            )
            self.assertEqual(reg.status_code, 201)
            reg_data = reg.json()
            self.assertTrue(reg_data["requires_otp"])
            self.assertEqual(len(reg_data["dev_otp"]), 6)

            # Resend immediately hits 429 cooldown
            resend = self.client.post(
                "/api/auth/send-otp/",
                {"email": "jane@example.com", "purpose": "register"},
                format="json",
            )
            self.assertEqual(resend.status_code, 429)
            self.assertIn("retry_after", resend.json())

            # Verify OTP activates user and issues tokens
            verify = self.client.post(
                "/api/auth/verify-otp/",
                {"email": "jane@example.com", "code": reg_data["dev_otp"], "purpose": "register"},
                format="json",
            )
            self.assertEqual(verify.status_code, 200)
            v_data = verify.json()
            self.assertIn("access", v_data)
            self.assertIn("refresh", v_data)
            self.assertEqual(v_data["user"]["email"], "jane@example.com")

            # Login succeeds after activation
            login_res = self.client.post(
                "/api/auth/login/",
                {"email": "jane@example.com", "password": "Password123"},
                format="json",
            )
            self.assertEqual(login_res.status_code, 200)
            self.assertIn("access", login_res.json())

            # Refresh rotates tokens
            refresh_res = self.client.post(
                "/api/auth/refresh/",
                {"refresh": login_res.json()["refresh"]},
                format="json",
            )
            self.assertEqual(refresh_res.status_code, 200)
            self.assertIn("access", refresh_res.json())
            self.assertNotEqual(refresh_res.json()["refresh"], login_res.json()["refresh"])

    def test_forgot_password_does_not_leak_unknown_email_otp(self):
        with self.settings(DEBUG=True):
            res = self.client.post(
                "/api/auth/forgot-password/",
                {"email": "unknown@example.com"},
                format="json",
            )
            self.assertEqual(res.status_code, 200)
            self.assertNotIn("dev_otp", res.json())

    def test_workspace_endpoints_require_authentication(self):
        for method, url in [
            ("get", "/api/jobs/"),
            ("get", "/api/erp/bootstrap/"),
            ("get", "/api/saas/state/"),
            ("post", "/api/ingestion/upload/"),
        ]:
            res = getattr(self.client, method)(url)
            self.assertEqual(res.status_code, 401, f"Expected 401 for {url}, got {res.status_code}")

    def test_forgot_reset_password_and_unlock_flow(self):
        user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="OldPassword123",
            is_active=True,
        )
        with self.settings(DEBUG=True):
            forgot = self.client.post("/api/auth/forgot-password/", {"email": user.email}, format="json")
            self.assertEqual(forgot.status_code, 200)
            otp_code = forgot.json()["dev_otp"]

            verify = self.client.post(
                "/api/auth/verify-otp/",
                {"email": user.email, "code": otp_code, "purpose": "forgot_password"},
                format="json",
            )
            self.assertEqual(verify.status_code, 200)
            reset_token = verify.json()["reset_token"]

            reset = self.client.post(
                "/api/auth/reset-password/",
                {"reset_token": reset_token, "new_password": "NewPassword123"},
                format="json",
            )
            self.assertEqual(reset.status_code, 200)

            unlock = self.client.post(
                "/api/auth/unlock/",
                {"email": user.email, "password": "NewPassword123"},
                format="json",
            )
            self.assertEqual(unlock.status_code, 200)
            self.assertIn("access", unlock.json())

            access_token = unlock.json()["access"]
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
            upgrade = self.client.post("/api/saas/upgrade/", {"plan_tier": "pro"}, format="json")
            self.assertEqual(upgrade.status_code, 200)
            self.assertEqual(upgrade.json()["plan_tier"], "pro")

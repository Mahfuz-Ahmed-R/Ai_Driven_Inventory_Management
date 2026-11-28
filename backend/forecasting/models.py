import uuid
from django.conf import settings
from django.db import models


class AnalysisJob(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analysis_jobs",
    )
    company_name = models.CharField(max_length=255, default="Demo Retail Co.")
    filename = models.CharField(max_length=255)
    lead_time_days = models.PositiveIntegerField(default=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True, default="")
    dataset_meta = models.JSONField(default=dict)
    summary_kpis = models.JSONField(default=dict)
    category_breakdown = models.JSONField(default=list)
    aggregate_trajectory = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class UploadedDataset(models.Model):
    """Stores metadata, classification, column mapping, and validation report for an uploaded CSV."""

    STATUS_CHOICES = [
        ("uploaded", "Uploaded"),
        ("needs_mapping", "Needs Mapping Confirmation"),
        ("rejected", "Rejected"),
        ("validated", "Validated"),
        ("confirmed", "Confirmed for Forecasting"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="uploaded_datasets",
    )
    company_name = models.CharField(max_length=255, default="Partner Retail Corp")
    original_filename = models.CharField(max_length=255)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    raw_file_path = models.TextField(blank=True, default="")
    processed_file_path = models.TextField(blank=True, default="")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="uploaded")
    classification = models.CharField(max_length=64, default="Ambiguous Dataset")
    classification_confidence = models.FloatField(default=0.0)
    analysis_source = models.CharField(max_length=40, default="gemini")
    classification_payload = models.JSONField(default=dict)
    column_mapping = models.JSONField(default=dict)
    validation_report = models.JSONField(default=dict)
    dataset_profile = models.JSONField(default=dict)
    analysis_job = models.ForeignKey(
        AnalysisJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_datasets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.original_filename} [{self.classification}] ({self.status})"


class SKUForecast(models.Model):
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name="skus")
    sku = models.CharField(max_length=120)
    product_name = models.CharField(max_length=255)
    category = models.CharField(max_length=120, default="General")
    store_id = models.CharField(max_length=120, default="MAIN_STORE")
    price = models.FloatField(default=18.0)
    current_stock = models.FloatField(default=0.0)
    avg_daily_velocity = models.FloatField(default=0.0)
    total_28d_demand = models.FloatField(default=0.0)
    days_left = models.IntegerField(default=28)
    run_out_date = models.CharField(max_length=40, default="Safe (>28d)")
    urgency = models.CharField(max_length=20, default="healthy")
    safety_stock = models.IntegerField(default=0)
    reorder_point = models.IntegerField(default=0)
    suggested_order_qty = models.IntegerField(default=0)
    order_cost = models.FloatField(default=0.0)
    reorder_by = models.CharField(max_length=40, default="No action needed")
    method = models.CharField(max_length=60, default="LightGBM (Tweedie)")
    forecast_payload = models.JSONField(default=dict)
    sawtooth_payload = models.JSONField(default=list)

    class Meta:
        ordering = ["days_left", "-total_28d_demand"]


class PolicyBenchmark(models.Model):
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name="policies")
    policy_key = models.CharField(max_length=40)
    policy_name = models.CharField(max_length=120)
    total_cost = models.FloatField(default=0.0)
    holding_cost = models.FloatField(default=0.0)
    stockout_cost = models.FloatField(default=0.0)
    stockout_units = models.FloatField(default=0.0)
    avg_inventory = models.FloatField(default=0.0)
    fill_rate = models.FloatField(default=0.0)
    net_profit = models.FloatField(default=0.0)


class BusinessReport(models.Model):
    job = models.OneToOneField(AnalysisJob, on_delete=models.CASCADE, related_name="report")
    gemini_executive_summary = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)


# ---------------------------------------------------------------------------
# Dynamic ERP & POS Inventory Models
# ---------------------------------------------------------------------------

class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class SubCategory(models.Model):
    code = models.CharField(max_length=40, unique=True)
    category = models.CharField(max_length=120)
    sub_category = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class Brand(models.Model):
    name = models.CharField(max_length=120, unique=True)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class Unit(models.Model):
    name = models.CharField(max_length=120, unique=True)
    short_name = models.CharField(max_length=30)
    products_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class VariantAttribute(models.Model):
    variant = models.CharField(max_length=120, unique=True)
    values = models.JSONField(default=list)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class Warranty(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, default="")
    duration = models.CharField(max_length=60, default="1 Year")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class Warehouse(models.Model):
    name = models.CharField(max_length=150, unique=True)
    contact = models.CharField(max_length=120, default="Manager")
    phone = models.CharField(max_length=40, default="+10000000000")
    products_count = models.IntegerField(default=0)
    stock = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default="Active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class Store(models.Model):
    name = models.CharField(max_length=150, unique=True)
    username = models.CharField(max_length=120, default="storeadmin")
    email = models.EmailField(default="store@example.com")
    phone = models.CharField(max_length=40, default="+10000000000")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class Product(models.Model):
    sku = models.CharField(max_length=120, unique=True)
    product_name = models.CharField(max_length=255)
    category = models.CharField(max_length=120, default="General")
    sub_category = models.CharField(max_length=120, default="General")
    brand = models.CharField(max_length=120, default="Generic")
    unit = models.CharField(max_length=40, default="Pc")
    warehouse = models.CharField(max_length=150, default="Lavish Warehouse")
    store_id = models.CharField(max_length=150, default="Electro Mart")
    product_type = models.CharField(max_length=40, default="Single")
    price = models.FloatField(default=0.0)
    current_stock = models.IntegerField(default=0)
    qty_alert = models.IntegerField(default=15)
    mfg_date = models.CharField(max_length=40, blank=True, default="2025-01-01")
    exp_date = models.CharField(max_length=40, blank=True, default="2027-01-01")
    warranty = models.CharField(max_length=120, blank=True, default="1 Year")
    total_28d_demand = models.IntegerField(default=0)
    method = models.CharField(max_length=60, default="Database")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class Customer(models.Model):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(default="customer@example.com")
    phone = models.CharField(max_length=40, default="+10000000000")
    country = models.CharField(max_length=80, default="USA")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class Biller(models.Model):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    company = models.CharField(max_length=150, default="Retail Corp")
    email = models.EmailField(default="biller@example.com")
    phone = models.CharField(max_length=40, default="+10000000000")
    country = models.CharField(max_length=80, default="USA")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class Supplier(models.Model):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(default="supplier@example.com")
    phone = models.CharField(max_length=40, default="+10000000000")
    country = models.CharField(max_length=80, default="USA")
    status = models.CharField(max_length=20, default="Active")

    class Meta:
        ordering = ["-id"]


class StockTransfer(models.Model):
    ref = models.CharField(max_length=40, unique=True)
    from_warehouse = models.CharField(max_length=150)
    to_warehouse = models.CharField(max_length=150)
    products_count = models.IntegerField(default=1)
    qty = models.IntegerField(default=1)
    date = models.CharField(max_length=40, default="Today")
    status = models.CharField(max_length=30, default="Completed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class StockAdjustment(models.Model):
    warehouse = models.CharField(max_length=150)
    store = models.CharField(max_length=150)
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=120)
    date = models.CharField(max_length=40, default="Today")
    person = models.CharField(max_length=120, default="Admin")
    qty = models.IntegerField(default=0)
    adjustment_type = models.CharField(max_length=40, default="Addition (+)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class POSOrder(models.Model):
    tx_id = models.CharField(max_length=40, unique=True)
    customer_name = models.CharField(max_length=150, default="Walk-in Customer")
    payment_method = models.CharField(max_length=40, default="Cash")
    subtotal = models.FloatField(default=0.0)
    discount_pct = models.FloatField(default=0.0)
    tax_amount = models.FloatField(default=0.0)
    grand_total = models.FloatField(default=0.0)
    status = models.CharField(max_length=30, default="Completed")
    items = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class Invoice(models.Model):
    inv_number = models.CharField(max_length=40, unique=True)
    customer_name = models.CharField(max_length=150)
    due_date = models.CharField(max_length=40, default="30 Days")
    amount = models.FloatField(default=0.0)
    paid = models.FloatField(default=0.0)
    due = models.FloatField(default=0.0)
    status = models.CharField(max_length=30, default="Paid")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class UserSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_sessions")
    refresh_jti = models.CharField(max_length=64, unique=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    ip_address = models.CharField(max_length=64, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-last_seen_at"]


class EmailOTP(models.Model):
    PURPOSE_CHOICES = [
        ("register", "Register Verification"),
        ("forgot_password", "Forgot Password"),
        ("two_step", "Two-Step Verification"),
    ]
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default="register")
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class WorkspaceProfile(models.Model):
    TIER_CHOICES = [
        ("free", "Free"),
        ("basic", "Basic"),
        ("pro", "Pro"),
        ("enterprise", "Enterprise"),
    ]
    key = models.CharField(max_length=64, unique=True, default="default")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workspace_profiles",
    )
    plan_tier = models.CharField(max_length=20, choices=TIER_CHOICES, default="free")
    onboarding_completed = models.BooleanField(default=False)
    onboarding_step = models.PositiveIntegerField(default=0)
    onboarding_data = models.JSONField(default=dict)
    referral_code = models.CharField(max_length=32, unique=True, default="DREAMS-AI-2026")
    referral_clicks = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class ReferralEvent(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("rewarded", "Rewarded"),
    ]
    referrer_code = models.CharField(max_length=32, db_index=True)
    referred_email = models.EmailField()
    referred_company = models.CharField(max_length=150, default="Retail Partner")
    plan_tier = models.CharField(max_length=20, default="pro")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reward_amount = models.FloatField(default=25.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

from django.contrib import admin
from .models import (
    AnalysisJob, SKUForecast, PolicyBenchmark, BusinessReport,
    Category, SubCategory, Brand, Unit, VariantAttribute, Warranty,
    Warehouse, Store, Product, Customer, Biller, Supplier,
    StockTransfer, StockAdjustment, POSOrder, Invoice,
    UserSession, EmailOTP,
)

for model in [
    AnalysisJob, SKUForecast, PolicyBenchmark, BusinessReport,
    Category, SubCategory, Brand, Unit, VariantAttribute, Warranty,
    Warehouse, Store, Product, Customer, Biller, Supplier,
    StockTransfer, StockAdjustment, POSOrder, Invoice,
    UserSession, EmailOTP,
]:
    admin.site.register(model)

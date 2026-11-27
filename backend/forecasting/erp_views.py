import random
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from .models import (
    Category, SubCategory, Brand, Unit, VariantAttribute, Warranty,
    Warehouse, Store, Product, Customer, Biller, Supplier,
    StockTransfer, StockAdjustment, POSOrder, Invoice,
)
from .auth_utils import require_auth
from .saas_views import TIER_CONFIGS, get_active_workspace_profile


def _serialize_product(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "product_name": p.product_name,
        "category": p.category,
        "sub_category": p.sub_category,
        "brand": p.brand,
        "unit": p.unit,
        "warehouse": p.warehouse,
        "store_id": p.store_id,
        "product_type": p.product_type,
        "price": p.price,
        "current_stock": p.current_stock,
        "qty_alert": p.qty_alert,
        "mfg_date": p.mfg_date,
        "exp_date": p.exp_date,
        "warranty": p.warranty,
        "total_28d_demand": p.total_28d_demand,
        "method": p.method,
    }


def _serialize_bootstrap() -> dict:
    return {
        "products": [_serialize_product(p) for p in Product.objects.all()],
        "categories": [
            {"id": c.id, "name": c.name, "slug": c.slug, "created_on": c.created_at.strftime("%d %b %Y"), "status": c.status}
            for c in Category.objects.all()
        ],
        "sub_categories": [
            {"id": s.id, "code": s.code, "category": s.category, "sub_category": s.sub_category, "description": s.description, "status": s.status}
            for s in SubCategory.objects.all()
        ],
        "brands": [
            {"id": b.id, "name": b.name, "created_date": b.created_at.strftime("%d %b %Y"), "status": b.status}
            for b in Brand.objects.all()
        ],
        "units": [
            {"id": u.id, "name": u.name, "short_name": u.short_name, "products": u.products_count, "created_date": u.created_at.strftime("%d %b %Y"), "status": u.status}
            for u in Unit.objects.all()
        ],
        "variants": [
            {"id": v.id, "variant": v.variant, "values": v.values, "created_date": v.created_at.strftime("%d %b %Y"), "status": v.status}
            for v in VariantAttribute.objects.all()
        ],
        "warranties": [
            {"id": w.id, "name": w.name, "description": w.description, "duration": w.duration, "status": w.status}
            for w in Warranty.objects.all()
        ],
        "warehouses": [
            {"id": w.id, "name": w.name, "contact": w.contact, "phone": w.phone, "products": w.products_count, "stock": w.stock, "created_on": w.created_at.strftime("%d %b %Y"), "status": w.status}
            for w in Warehouse.objects.all()
        ],
        "stores": [
            {"id": s.id, "name": s.name, "username": s.username, "email": s.email, "phone": s.phone, "status": s.status}
            for s in Store.objects.all()
        ],
        "customers": [
            {"id": c.id, "code": c.code, "name": c.name, "email": c.email, "phone": c.phone, "country": c.country, "status": c.status}
            for c in Customer.objects.all()
        ],
        "billers": [
            {"id": b.id, "code": b.code, "name": b.name, "company": b.company, "email": b.email, "phone": b.phone, "country": b.country, "status": b.status}
            for b in Biller.objects.all()
        ],
        "suppliers": [
            {"id": s.id, "code": s.code, "name": s.name, "email": s.email, "phone": s.phone, "country": s.country, "status": s.status}
            for s in Supplier.objects.all()
        ],
        "transfers": [
            {"id": t.id, "ref": t.ref, "from": t.from_warehouse, "to": t.to_warehouse, "products": t.products_count, "qty": t.qty, "date": t.date, "status": t.status}
            for t in StockTransfer.objects.all()
        ],
        "adjustments": [
            {"id": a.id, "warehouse": a.warehouse, "store": a.store, "product": a.product_name, "sku": a.sku, "date": a.date, "person": a.person, "qty": a.qty, "type": a.adjustment_type}
            for a in StockAdjustment.objects.all()
        ],
        "pos_orders": [
            {
                "id": o.id,
                "tx_id": o.tx_id,
                "customer_name": o.customer_name,
                "payment_method": o.payment_method,
                "subtotal": o.subtotal,
                "discount_pct": o.discount_pct,
                "tax_amount": o.tax_amount,
                "grand_total": o.grand_total,
                "status": o.status,
                "items": o.items,
                "created_at": o.created_at.isoformat(),
            }
            for o in POSOrder.objects.all()[:50]
        ],
        "invoices": [
            {"id": i.id, "inv": i.inv_number, "customer": i.customer_name, "due_date": i.due_date, "amount": i.amount, "paid": i.paid, "due": i.due, "status": i.status}
            for i in Invoice.objects.all()
        ],
    }


@api_view(["GET"])
@require_auth
def erp_bootstrap(request):
    return Response(_serialize_bootstrap())


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def products_list_create(request):
    if request.method == "GET":
        return Response([_serialize_product(p) for p in Product.objects.all()])

    data = request.data
    profile = get_active_workspace_profile(request)
    tier_cfg = TIER_CONFIGS.get(profile.plan_tier, TIER_CONFIGS["free"])
    if Product.objects.count() >= tier_cfg["max_products"]:
        return Response(
            {"error": f"Product limit ({tier_cfg['max_products']}) reached for {tier_cfg['label']} plan. Upgrade to add more.", "code": "TIER_LIMIT"},
            status=status.HTTP_403_FORBIDDEN,
        )
    sku = (data.get("sku") or "").strip()
    product_name = (data.get("product_name") or "").strip()
    if not sku or not product_name:
        return Response({"error": "sku and product_name are required."}, status=status.HTTP_400_BAD_REQUEST)
    if Product.objects.filter(sku=sku).exists():
        return Response({"error": f"SKU '{sku}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

    stock = int(data.get("current_stock", 0) or 0)
    prod = Product.objects.create(
        sku=sku,
        product_name=product_name,
        category=data.get("category") or "General",
        sub_category=data.get("sub_category") or "General",
        brand=data.get("brand") or "Generic",
        unit=data.get("unit") or "Pc",
        warehouse=data.get("warehouse") or "Lavish Warehouse",
        store_id=data.get("store_id") or "Electro Mart",
        product_type=data.get("product_type") or "Single",
        price=float(data.get("price", 0) or 0),
        current_stock=stock,
        qty_alert=int(data.get("qty_alert", 15) or 15),
        mfg_date=data.get("mfg_date") or "2025-01-01",
        exp_date=data.get("exp_date") or "2027-01-01",
        warranty=data.get("warranty") or "1 Year",
        total_28d_demand=int(data.get("total_28d_demand") or max(1, round(stock * 0.4))),
        method="Database",
    )
    return Response(_serialize_product(prod), status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@parser_classes([JSONParser])
@require_auth
def product_detail(request, sku):
    prod = get_object_or_404(Product, sku=sku)
    if request.method == "DELETE":
        prod.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    for field in ["product_name", "category", "sub_category", "brand", "unit", "warehouse", "store_id", "price", "current_stock", "qty_alert"]:
        if field in request.data:
            setattr(prod, field, request.data[field])
    prod.save()
    return Response(_serialize_product(prod))


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def categories_view(request):
    if request.method == "GET":
        return Response([
            {"id": c.id, "name": c.name, "slug": c.slug, "created_on": c.created_at.strftime("%d %b %Y"), "status": c.status}
            for c in Category.objects.all()
        ])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Category name is required."}, status=status.HTTP_400_BAD_REQUEST)
    slug = slugify(request.data.get("slug") or name)
    c = Category.objects.create(name=name, slug=slug, status=request.data.get("status") or "Active")
    return Response({"id": c.id, "name": c.name, "slug": c.slug, "created_on": c.created_at.strftime("%d %b %Y"), "status": c.status}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@require_auth
def category_delete(request, pk):
    get_object_or_404(Category, pk=pk).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def sub_categories_view(request):
    if request.method == "GET":
        return Response([
            {"id": s.id, "code": s.code, "category": s.category, "sub_category": s.sub_category, "description": s.description, "status": s.status}
            for s in SubCategory.objects.all()
        ])
    sub = (request.data.get("sub_category") or "").strip()
    if not sub:
        return Response({"error": "sub_category is required."}, status=status.HTTP_400_BAD_REQUEST)
    code = request.data.get("code") or f"CT0{SubCategory.objects.count() + 11}"
    s = SubCategory.objects.create(
        code=code,
        category=request.data.get("category") or "General",
        sub_category=sub,
        description=request.data.get("description") or "Custom sub-category",
    )
    return Response({"id": s.id, "code": s.code, "category": s.category, "sub_category": s.sub_category, "description": s.description, "status": s.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def brands_view(request):
    if request.method == "GET":
        return Response([{"id": b.id, "name": b.name, "created_date": b.created_at.strftime("%d %b %Y"), "status": b.status} for b in Brand.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Brand name is required."}, status=status.HTTP_400_BAD_REQUEST)
    b = Brand.objects.create(name=name)
    return Response({"id": b.id, "name": b.name, "created_date": b.created_at.strftime("%d %b %Y"), "status": b.status}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@require_auth
def brand_delete(request, pk):
    get_object_or_404(Brand, pk=pk).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def units_view(request):
    if request.method == "GET":
        return Response([{"id": u.id, "name": u.name, "short_name": u.short_name, "products": u.products_count, "created_date": u.created_at.strftime("%d %b %Y"), "status": u.status} for u in Unit.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Unit name is required."}, status=status.HTTP_400_BAD_REQUEST)
    u = Unit.objects.create(name=name, short_name=request.data.get("short_name") or name[:2].lower(), products_count=int(request.data.get("products", 0) or 0))
    return Response({"id": u.id, "name": u.name, "short_name": u.short_name, "products": u.products_count, "created_date": u.created_at.strftime("%d %b %Y"), "status": u.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def variants_view(request):
    if request.method == "GET":
        return Response([{"id": v.id, "variant": v.variant, "values": v.values, "created_date": v.created_at.strftime("%d %b %Y"), "status": v.status} for v in VariantAttribute.objects.all()])
    variant = (request.data.get("variant") or "").strip()
    if not variant:
        return Response({"error": "Variant name is required."}, status=status.HTTP_400_BAD_REQUEST)
    values = request.data.get("values") or []
    if isinstance(values, str):
        values = [x.strip() for x in values.split(",") if x.strip()]
    v = VariantAttribute.objects.create(variant=variant, values=values)
    return Response({"id": v.id, "variant": v.variant, "values": v.values, "created_date": v.created_at.strftime("%d %b %Y"), "status": v.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def warranties_view(request):
    if request.method == "GET":
        return Response([{"id": w.id, "name": w.name, "description": w.description, "duration": w.duration, "status": w.status} for w in Warranty.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Warranty name is required."}, status=status.HTTP_400_BAD_REQUEST)
    w = Warranty.objects.create(name=name, description=request.data.get("description") or "Standard coverage", duration=request.data.get("duration") or "1 Year")
    return Response({"id": w.id, "name": w.name, "description": w.description, "duration": w.duration, "status": w.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def warehouses_view(request):
    if request.method == "GET":
        return Response([{"id": w.id, "name": w.name, "contact": w.contact, "phone": w.phone, "products": w.products_count, "stock": w.stock, "created_on": w.created_at.strftime("%d %b %Y"), "status": w.status} for w in Warehouse.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Warehouse name is required."}, status=status.HTTP_400_BAD_REQUEST)
    w = Warehouse.objects.create(name=name, contact=request.data.get("contact") or "Manager", phone=request.data.get("phone") or "+10000000000")
    return Response({"id": w.id, "name": w.name, "contact": w.contact, "phone": w.phone, "products": w.products_count, "stock": w.stock, "created_on": w.created_at.strftime("%d %b %Y"), "status": w.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def stores_view(request):
    if request.method == "GET":
        return Response([{"id": s.id, "name": s.name, "username": s.username, "email": s.email, "phone": s.phone, "status": s.status} for s in Store.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Store name is required."}, status=status.HTTP_400_BAD_REQUEST)
    s = Store.objects.create(name=name, username=slugify(name).replace("-", ""), email=request.data.get("email") or "store@example.com", phone=request.data.get("phone") or "+10000000000")
    return Response({"id": s.id, "name": s.name, "username": s.username, "email": s.email, "phone": s.phone, "status": s.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def customers_view(request):
    if request.method == "GET":
        return Response([{"id": c.id, "code": c.code, "name": c.name, "email": c.email, "phone": c.phone, "country": c.country, "status": c.status} for c in Customer.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Customer name is required."}, status=status.HTTP_400_BAD_REQUEST)
    c = Customer.objects.create(
        code=f"CU{Customer.objects.count() + 11:03d}",
        name=name,
        email=request.data.get("email") or "new@example.com",
        phone=request.data.get("phone") or "+10000000000",
        country=request.data.get("country") or "USA",
    )
    return Response({"id": c.id, "code": c.code, "name": c.name, "email": c.email, "phone": c.phone, "country": c.country, "status": c.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def billers_view(request):
    if request.method == "GET":
        return Response([{"id": b.id, "code": b.code, "name": b.name, "company": b.company, "email": b.email, "phone": b.phone, "country": b.country, "status": b.status} for b in Biller.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Biller name is required."}, status=status.HTTP_400_BAD_REQUEST)
    b = Biller.objects.create(
        code=f"BI{Biller.objects.count() + 11:03d}",
        name=name,
        company=request.data.get("company") or "New Corp",
        email=request.data.get("email") or "biller@example.com",
        phone=request.data.get("phone") or "+10000000000",
        country=request.data.get("country") or "USA",
    )
    return Response({"id": b.id, "code": b.code, "name": b.name, "company": b.company, "email": b.email, "phone": b.phone, "country": b.country, "status": b.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def suppliers_view(request):
    if request.method == "GET":
        return Response([{"id": s.id, "code": s.code, "name": s.name, "email": s.email, "phone": s.phone, "country": s.country, "status": s.status} for s in Supplier.objects.all()])
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Supplier name is required."}, status=status.HTTP_400_BAD_REQUEST)
    s = Supplier.objects.create(
        code=f"SU{Supplier.objects.count() + 11:03d}",
        name=name,
        email=request.data.get("email") or "supplier@example.com",
        phone=request.data.get("phone") or "+10000000000",
        country=request.data.get("country") or "USA",
    )
    return Response({"id": s.id, "code": s.code, "name": s.name, "email": s.email, "phone": s.phone, "country": s.country, "status": s.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def transfers_view(request):
    if request.method == "GET":
        return Response([
            {"id": t.id, "ref": t.ref, "from": t.from_warehouse, "to": t.to_warehouse, "products": t.products_count, "qty": t.qty, "date": t.date, "status": t.status}
            for t in StockTransfer.objects.all()
        ])
    from_wh = request.data.get("from") or "Lavish Warehouse"
    to_wh = request.data.get("to") or "Quaint Warehouse"
    qty = max(1, int(request.data.get("qty", 1) or 1))
    ref = f"#{random.randint(100000, 999999)}"
    with transaction.atomic():
        t = StockTransfer.objects.create(
            ref=ref,
            from_warehouse=from_wh,
            to_warehouse=to_wh,
            products_count=int(request.data.get("products", 1) or 1),
            qty=qty,
            date="Today",
            status="Completed",
        )
        Warehouse.objects.filter(name=from_wh).update(stock=max(0, (Warehouse.objects.filter(name=from_wh).first().stock if Warehouse.objects.filter(name=from_wh).exists() else 0) - qty))
        if Warehouse.objects.filter(name=to_wh).exists():
            wh_to = Warehouse.objects.get(name=to_wh)
            wh_to.stock += qty
            wh_to.save()
    return Response({"id": t.id, "ref": t.ref, "from": t.from_warehouse, "to": t.to_warehouse, "products": t.products_count, "qty": t.qty, "date": t.date, "status": t.status}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def adjustments_view(request):
    if request.method == "GET":
        return Response([
            {"id": a.id, "warehouse": a.warehouse, "store": a.store, "product": a.product_name, "sku": a.sku, "date": a.date, "person": a.person, "qty": a.qty, "type": a.adjustment_type}
            for a in StockAdjustment.objects.all()
        ])
    sku = request.data.get("sku") or ""
    qty = int(request.data.get("qty", 10) or 10)
    adj_type = request.data.get("type") or "Addition (+)"
    with transaction.atomic():
        prod = Product.objects.filter(sku=sku).first()
        if prod:
            if "+" in adj_type:
                prod.current_stock += qty
            else:
                prod.current_stock = max(0, prod.current_stock - qty)
            prod.save()
        a = StockAdjustment.objects.create(
            warehouse=request.data.get("warehouse") or (prod.warehouse if prod else "Lavish Warehouse"),
            store=request.data.get("store") or (prod.store_id if prod else "Electro Mart"),
            product_name=request.data.get("product") or (prod.product_name if prod else sku),
            sku=sku,
            date="Today",
            person=request.data.get("person") or "Admin",
            qty=qty,
            adjustment_type=adj_type,
        )
    return Response({"id": a.id, "warehouse": a.warehouse, "store": a.store, "product": a.product_name, "sku": a.sku, "date": a.date, "person": a.person, "qty": a.qty, "type": a.adjustment_type}, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
@require_auth
def pos_orders_view(request):
    if request.method == "GET":
        return Response([
            {
                "id": o.id, "tx_id": o.tx_id, "customer_name": o.customer_name,
                "payment_method": o.payment_method, "subtotal": o.subtotal,
                "discount_pct": o.discount_pct, "tax_amount": o.tax_amount,
                "grand_total": o.grand_total, "status": o.status,
                "items": o.items, "created_at": o.created_at.isoformat(),
            }
            for o in POSOrder.objects.all()[:50]
        ])

    items = request.data.get("items") or []
    if not items:
        return Response({"error": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

    customer_name = request.data.get("customer_name") or "Walk-in Customer"
    payment_method = request.data.get("payment_method") or "Cash"
    discount_pct = float(request.data.get("discount_pct", 0) or 0)
    order_status = request.data.get("status") or "Completed"

    subtotal = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in items)
    discount_amt = (subtotal * discount_pct) / 100.0
    tax_amount = round((subtotal - discount_amt) * 0.05, 2)
    grand_total = round(max(0.0, subtotal - discount_amt + tax_amount), 2)
    tx_num = 65564 + POSOrder.objects.count()
    tx_id = f"#{tx_num}"

    with transaction.atomic():
        order = POSOrder.objects.create(
            tx_id=tx_id,
            customer_name=customer_name,
            payment_method=payment_method,
            subtotal=round(subtotal, 2),
            discount_pct=discount_pct,
            tax_amount=tax_amount,
            grand_total=grand_total,
            status=order_status,
            items=items,
        )
        if order_status == "Completed":
            for item in items:
                prod = Product.objects.filter(sku=item.get("sku")).first()
                if prod:
                    prod.current_stock = max(0, prod.current_stock - int(item.get("qty", 1)))
                    prod.save()
            inv_num = f"INV{Invoice.objects.count() + 1:03d}"
            Invoice.objects.create(
                inv_number=inv_num,
                customer_name=customer_name,
                due_date="Paid Today",
                amount=grand_total,
                paid=grand_total,
                due=0.0,
                status="Paid",
            )

    return Response({
        "id": order.id,
        "tx_id": order.tx_id,
        "customer_name": order.customer_name,
        "payment_method": order.payment_method,
        "grand_total": order.grand_total,
        "status": order.status,
        "items": order.items,
    }, status=status.HTTP_201_CREATED)

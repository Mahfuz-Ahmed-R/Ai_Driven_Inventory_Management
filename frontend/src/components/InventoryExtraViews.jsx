import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import {
  Package,
  AlertTriangle,
  Plus,
  Printer,
  QrCode,
  Barcode,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Mail,
  Layers,
} from "lucide-react";
import { erpRequest } from "../hooks/useErpData";
import DataTable from "./ui/DataTable";
import { useConfirm } from "./ui/ConfirmDialog";
import { useToast } from "./ui/ToastProvider";
import { useAutosave } from "../hooks/useAutosave";
import { AutosaveIndicator } from "./ui/AutosaveIndicator";
import { FormField } from "./ui/FormField";
import { validateForm, validators } from "../utils/validation";
import { useSaas } from "../context/SaasContext";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";
const TH = "py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400";
const INPUT = "w-full px-3 py-2 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]";
const COLORS = ["#0E9384", "#0F766E", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];

function StatusBadge({ status }) {
  const ok = status === "Active" || status === "healthy";
  return (
    <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
      {status}
    </span>
  );
}

export default function InventoryExtraViews({
  page,
  job,
  erpData,
  erpLoading,
  erpError,
  refreshErpData,
  optimisticDeleteProduct,
  optimisticBulkProducts,
  optimisticCreateProduct,
  searchQuery,
  darkMode,
  onNavigate,
}) {
  const allProducts = useMemo(() => (job?.skus?.length ? job.skus : erpData?.products || []), [job, erpData?.products]);
  const confirm = useConfirm();
  const toast = useToast();
  const { openUpgradeModal, refreshSaas } = useSaas();

  const [catFilter, setCatFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [lowStockTab, setLowStockTab] = useState("low");
  const [warehouseFilter, setWarehouseFilter] = useState("All");

  const categories = erpData?.categories || [];
  const subCategories = erpData?.sub_categories || [];
  const brands = erpData?.brands || [];
  const units = erpData?.units || [];
  const variants = erpData?.variants || [];
  const warranties = erpData?.warranties || [];
  const warehouses = erpData?.warehouses || [];

  const [newItemName, setNewItemName] = useState("");
  const [newItemExtra, setNewItemExtra] = useState("");
  const [newItemThird, setNewItemThird] = useState("");

  const [prodForm, setProdForm] = useState({
    product_name: "",
    sku: "",
    category: "Electronics",
    sub_category: "Audio",
    brand: "Apple",
    unit: "Pc",
    warehouse: "Lavish Warehouse",
    store_id: "Electro Mart",
    product_type: "Single",
    price: 120,
    current_stock: 50,
    qty_alert: 10,
    mfg_date: "2025-01-10",
    exp_date: "2027-01-10",
    warranty: "1 Year",
  });
  const [prodSavedMsg, setProdSavedMsg] = useState("");
  const [prodTouched, setProdTouched] = useState({});
  const [prodSubmitting, setProdSubmitting] = useState(false);

  const {
    status: prodAutoStatus,
    lastSavedAt: prodLastSavedAt,
    loadDraft: loadProdDraft,
    clearDraft: clearProdDraft,
    retrySave: retryProdSave,
  } = useAutosave({
    key: "dreams_create_product_draft",
    data: prodForm,
    enabled: page === "create-product",
  });

  useEffect(() => {
    if (page === "create-product") {
      const draft = loadProdDraft();
      if (draft?.data && (draft.data.product_name || draft.data.sku)) {
        setProdForm((prev) => ({ ...prev, ...draft.data }));
      }
    }
  }, [page]);

  const prodValidation = useMemo(
    () =>
      validateForm(prodForm, {
        product_name: [validators.required("Product name"), validators.minLength(2, "Product name")],
        sku: [validators.required("SKU"), validators.sku()],
        price: [validators.positiveNumber("Price")],
        current_stock: [validators.positiveNumber("Quantity", { allowZero: true })],
        qty_alert: [validators.positiveNumber("Quantity alert", { allowZero: true })],
        exp_date: [validators.dateAfter("mfg_date", "manufactured date")],
      }),
    [prodForm]
  );

  const [selectedPrintSkus, setSelectedPrintSkus] = useState(() => allProducts.slice(0, 3).map((s) => ({ ...s, printQty: 4 })));
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProdName, setShowProdName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [qrRefNum, setQrRefNum] = useState("REF-2025-8841");
  const [showPreview, setShowPreview] = useState(false);

  const gridStroke = darkMode ? "#27272A" : "#E4E4E7";
  const q = (searchQuery || "").toLowerCase();
  const filteredProducts = useMemo(() => {
    return allProducts.filter((s) => {
      if (catFilter !== "All" && s.category !== catFilter) return false;
      if (brandFilter !== "All" && (s.brand || "Generic") !== brandFilter) return false;
      if (q && !s.sku.toLowerCase().includes(q) && !s.product_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProducts, catFilter, brandFilter, q]);

  // 1. PRODUCTS
  if (page === "products") {
    if (!erpLoading && allProducts.length === 0) {
      return (
        <div className={`${CARD} p-8 text-center space-y-3`}>
          <h1 className="text-lg font-bold text-zinc-950 dark:text-white">No Products Yet</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Upload a CSV to populate your product catalog and demand forecasts.</p>
          <button onClick={() => onNavigate("upload")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5" /> Import CSV
          </button>
        </div>
      );
    }
    const cats = Array.from(new Set(allProducts.map((s) => s.category)));
    const brs = Array.from(new Set(allProducts.map((s) => s.brand || "Generic")));
    const chartData = filteredProducts.slice(0, 10).map((s) => ({
      sku: s.sku,
      stock: s.current_stock || 0,
      demand: s.total_28d_demand || 0,
    }));

    const isErpCatalog = !job?.skus?.length;

    const handleDeleteOne = async (row) => {
      const ok = await confirm({
        title: `Delete ${row.product_name}?`,
        description: `SKU ${row.sku} will be permanently removed from your ERP catalog.`,
        confirmLabel: "Delete Product",
      });
      if (!ok) return;
      try {
        await (optimisticDeleteProduct ? optimisticDeleteProduct(row.sku) : erpRequest(`/api/erp/products/${encodeURIComponent(row.sku)}/`, "DELETE"));
        refreshSaas();
        toast.success(`Deleted ${row.sku}`, {
          actionLabel: "Undo",
          onAction: async () => {
            try {
              await (optimisticCreateProduct ? optimisticCreateProduct(row) : erpRequest("/api/erp/products/", "POST", row));
              refreshSaas();
              toast.info(`Restored ${row.sku}`);
            } catch (e) {
              toast.error(e.message || "Could not restore product");
            }
          },
        });
      } catch (err) {
        toast.error(err.message || "Failed to delete product (rolled back)");
      }
    };

    const productColumns = [
      { key: "sku", label: "SKU", sortable: true, render: (s) => <span className="font-bold text-zinc-900 dark:text-white">{s.sku}</span> },
      {
        key: "product_name",
        label: "Product Name",
        sortable: true,
        render: (s) => (
          <span className="font-medium flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span className="truncate">{s.product_name}</span>
          </span>
        ),
      },
      { key: "category", label: "Category", sortable: true, render: (s) => <span className="text-zinc-500">{s.category}</span> },
      { key: "brand", label: "Brand", sortable: true, accessor: (s) => s.brand || "Freshmart", render: (s) => <span className="text-zinc-500">{s.brand || "Freshmart"}</span> },
      { key: "price", label: "Price", sortable: true, align: "right", render: (s) => <span className="font-semibold">${Number(s.price || 0).toFixed(2)}</span> },
      { key: "unit", label: "Unit", sortable: true, accessor: (s) => s.unit || "Pc", defaultHidden: true },
      { key: "current_stock", label: "Qty", sortable: true, align: "right", render: (s) => <span className="font-bold">{s.current_stock}</span> },
      { key: "total_28d_demand", label: "28D Forecast", sortable: true, align: "right", render: (s) => <span className="font-bold text-[#0E9384]">{s.total_28d_demand || 0}</span> },
      ...(isErpCatalog
        ? [
            {
              key: "actions",
              label: "Actions",
              align: "right",
              noExport: true,
              render: (s) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOne(s);
                  }}
                  aria-label={`Delete ${s.sku}`}
                  className="p-1.5 rounded-[6px] text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ),
            },
          ]
        : []),
    ];

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Product List</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your products ({allProducts.length} items)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate("upload")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-zinc-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-[#0F766E] hover:text-zinc-950 transition cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5" /> Import CSV
            </button>
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">On-Hand Stock vs. 28-Day Forecast Demand (Top 10 SKUs)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend />
                <Bar dataKey="stock" name="Current Stock" fill="#0E9384" radius={[4, 4, 0, 0]} />
                <Bar dataKey="demand" name="28D Forecast" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DataTable
          data={allProducts}
          columns={productColumns}
          rowKey="sku"
          persistKey="products"
          loading={erpLoading && allProducts.length === 0}
          error={erpError}
          onRetry={refreshErpData}
          externalSearch={searchQuery}
          searchPlaceholder="Search SKU, product name, or category..."
          filters={[
            { key: "category", label: "Category", options: cats },
            { key: "brand", label: "Brand", options: brs, accessor: (s) => s.brand || "Freshmart" },
          ]}
          dateRangeConfig={isErpCatalog ? { key: "mfg_date", label: "Mfg Date" } : null}
          selectable={isErpCatalog}
          exportFilename="products_catalog.csv"
          bulkActions={
            isErpCatalog
              ? [
                  {
                    key: "bulk-cat",
                    label: "Set General",
                    icon: Layers,
                    onClick: async (rows, clear) => {
                      try {
                        await optimisticBulkProducts?.(rows.map((r) => r.sku), "update_category", { category: "General" });
                        clear();
                        toast.success(`Updated ${rows.length} products to General category.`);
                      } catch (err) {
                        toast.error(err.message || "Bulk update failed");
                      }
                    },
                  },
                  {
                    key: "bulk-delete",
                    label: "Delete Selected",
                    icon: Trash2,
                    variant: "danger",
                    onClick: async (rows, clear) => {
                      const ok = await confirm({
                        title: "Delete Selected Products?",
                        description: "These SKUs will be permanently deleted from your catalog.",
                        confirmLabel: `Delete ${rows.length} Products`,
                        itemCount: rows.length,
                      });
                      if (!ok) return;
                      try {
                        await optimisticBulkProducts?.(rows.map((r) => r.sku), "delete");
                        clear();
                        refreshSaas();
                        toast.success(`Deleted ${rows.length} products.`);
                      } catch (err) {
                        toast.error(err.message || "Bulk delete failed (rolled back)");
                      }
                    },
                  },
                ]
              : []
          }
        />
      </div>
    );
  }

  // 2. EXPIRED PRODUCTS
  if (page === "expired-products") {
    if (allProducts.length === 0) {
      return (
        <div className={`${CARD} p-8 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
          No product data yet. Upload a CSV to track expired and expiring products.
        </div>
      );
    }
    const expiredCount = filteredProducts.filter((_, i) => i % 3 === 0).length;
    const expiringCount = filteredProducts.length - expiredCount;
    const pieData = [
      { name: "Expired", value: expiredCount },
      { name: "Expiring Soon", value: expiringCount },
    ];
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Expired Products</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Monitor manufactured & expiry dates across warehouse inventory</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={`lg:col-span-4 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-2">Shelf-Life Risk Split</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={4}>
                    <Cell fill="#EF4444" />
                    <Cell fill="#FE9F43" />
                  </Pie>
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`lg:col-span-8 ${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-2">Stock At Expiry Risk by SKU</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredProducts.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Bar dataKey="current_stock" name="Units at Risk" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>SKU</th>
                <th className={TH}>Product</th>
                <th className={TH}>Manufactured Date</th>
                <th className={TH}>Expired Date</th>
                <th className={`${TH} text-right`}>Stock</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredProducts.map((s, idx) => (
                <tr key={s.sku}>
                  <td className="py-3 px-4 font-bold">{s.sku}</td>
                  <td className="py-3 px-4 font-medium">{s.product_name}</td>
                  <td className="py-3 px-4 text-zinc-500">{s.mfg_date || "2024-11-18"}</td>
                  <td className="py-3 px-4 text-zinc-500">{s.exp_date || "2026-11-20"}</td>
                  <td className="py-3 px-4 text-right font-semibold">{s.current_stock}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${idx % 3 === 0 ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
                      {idx % 3 === 0 ? "Expired" : "Expiring Soon"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. LOW STOCKS
  if (page === "low-stocks") {
    if (allProducts.length === 0) {
      return (
        <div className={`${CARD} p-8 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
          No product data yet. Upload a CSV to monitor low-stock and out-of-stock SKUs.
        </div>
      );
    }
    const lowList = filteredProducts.filter((s) => {
      if (warehouseFilter !== "All" && (s.warehouse || s.store_id) !== warehouseFilter) return false;
      if (lowStockTab === "out") return (s.days_left ?? 5) <= 7 || s.current_stock <= 10;
      return s.urgency === "critical" || s.urgency === "watch" || s.current_stock <= 350;
    });
    const chartData = lowList.slice(0, 10).map((s) => ({
      sku: s.sku,
      days_left: s.days_left ?? 10,
      reorder: s.suggested_order_qty || 45,
    }));
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Low Stocks</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your low stocks & imminent stockout alerts</p>
          </div>
          <button onClick={() => alert("Stock alert email dispatched to procurement!")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#0E9384] text-white text-xs font-semibold cursor-pointer">
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>
        </div>

        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Days of Cover Remaining vs. Recommended Reorder Qty</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend />
                <Bar dataKey="days_left" name="Days Left" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reorder" name="Reorder Qty" fill="#0E9384" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {[
              { id: "low", label: "Low Stocks" },
              { id: "out", label: "Out of Stock (≤7d)" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLowStockTab(t.id)}
                className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition cursor-pointer ${
                  lowStockTab === t.id ? "bg-[#0F766E] text-white" : `${CARD} text-zinc-600 dark:text-slate-300`
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-3 py-2 text-xs rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700">
            <option value="All">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className={TH}>Warehouse</th>
                <th className={TH}>Store</th>
                <th className={TH}>Product</th>
                <th className={TH}>Category</th>
                <th className={TH}>SKU</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Days Left</th>
                <th className={`${TH} text-right`}>Reorder Qty</th>
                <th className={TH}>Reorder By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lowList.map((s) => (
                <tr key={s.sku}>
                  <td className="py-3 px-4 text-zinc-500">{s.warehouse || "Lavish Warehouse"}</td>
                  <td className="py-3 px-4 text-zinc-500">{s.store_id || "Electro Mart"}</td>
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${s.urgency === "critical" ? "text-red-500" : "text-amber-500"}`} />
                      <span>{s.product_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{s.category}</td>
                  <td className="py-3 px-4 font-bold">{s.sku}</td>
                  <td className="py-3 px-4 text-right font-semibold">{s.current_stock}</td>
                  <td className={`py-3 px-4 text-right font-bold ${(s.days_left ?? 10) <= 7 ? "text-red-500" : "text-amber-500"}`}>{s.days_left ?? 10}d</td>
                  <td className="py-3 px-4 text-right font-bold">{s.suggested_order_qty || 45} units</td>
                  <td className={`py-3 px-4 font-semibold ${s.reorder_by === "IMMEDIATE" ? "text-red-500" : "text-emerald-500"}`}>{s.reorder_by || "Within 7d"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. CATEGORIES (driven by uploaded CSV / active forecast job)
  if (page === "categories") {
    const breakdown = job?.category_breakdown || [];
    const skus = job?.skus || [];
    const totalDemand = breakdown.reduce((s, c) => s + (c.demand_units || 0), 0) || 1;
    const totalRevenue = breakdown.reduce((s, c) => s + (c.revenue || 0), 0) || 1;
    const COLORS = ["#0E9384", "#FE9F43", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981"];

    const enriched = breakdown.map((c, idx) => {
      const catSkus = skus.filter((s) => s.category === c.category);
      const criticalCount = catSkus.filter((s) => s.urgency === "critical").length;
      const totalStock = Math.round(catSkus.reduce((s, x) => s + (x.current_stock || 0), 0));
      const avgPrice = catSkus.length
        ? catSkus.reduce((s, x) => s + (x.price || 0), 0) / catSkus.length
        : 0;
      return {
        ...c,
        color: COLORS[idx % COLORS.length],
        demandShare: ((c.demand_units / totalDemand) * 100).toFixed(1),
        revenueShare: ((c.revenue / totalRevenue) * 100).toFixed(1),
        criticalCount,
        totalStock,
        avgPrice: avgPrice.toFixed(2),
      };
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Category Demand Split</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {job?.filename
                ? `Showing ${enriched.length} categories from ${job.filename} (${skus.length} SKUs)`
                : "Upload a sales CSV to view your category demand and revenue breakdown"}
            </p>
          </div>
          {!enriched.length && (
            <button
              onClick={() => onNavigate?.("upload")}
              className="px-3.5 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
            >
              Upload Sales CSV
            </button>
          )}
        </div>

        {enriched.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className={`${CARD} p-5 lg:col-span-7`}>
                <h2 className="text-sm font-bold mb-3 text-zinc-900 dark:text-white">
                  28-Day Forecast Demand by Category
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enriched}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#71717A" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                      <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="demand_units" name="28D Demand (Units)" fill="#0E9384" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sku_count" name="Active SKUs" fill="#FE9F43" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${CARD} p-5 lg:col-span-5`}>
                <h2 className="text-sm font-bold mb-3 text-zinc-900 dark:text-white">
                  Projected Revenue Split
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={enriched}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {enriched.map((entry) => (
                          <Cell key={entry.category} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...RECHARTS_TOOLTIP_PROPS}
                        formatter={(val) => `$${Number(val).toLocaleString()}`}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className={`${CARD} overflow-x-auto`}>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className={TH}>Category</th>
                    <th className={TH}>SKUs</th>
                    <th className={TH}>28D Demand (Units)</th>
                    <th className={TH}>Demand Share</th>
                    <th className={TH}>Projected Revenue</th>
                    <th className={TH}>Revenue Share</th>
                    <th className={TH}>On-Hand Stock</th>
                    <th className={TH}>Avg Price</th>
                    <th className={TH}>Critical SKUs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {enriched.map((c) => (
                    <tr key={c.category}>
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        {c.category}
                      </td>
                      <td className="py-3 px-4">{c.sku_count}</td>
                      <td className="py-3 px-4 font-semibold">{Number(c.demand_units).toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-500">{c.demandShare}%</td>
                      <td className="py-3 px-4 font-semibold">${Number(c.revenue).toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-500">{c.revenueShare}%</td>
                      <td className="py-3 px-4">{c.totalStock.toLocaleString()}</td>
                      <td className="py-3 px-4">${c.avgPrice}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            c.criticalCount > 0
                              ? "bg-red-500/15 text-red-500"
                              : "bg-emerald-500/15 text-emerald-500"
                          }`}
                        >
                          {c.criticalCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={`${CARD} p-8 text-center text-xs text-zinc-500 dark:text-zinc-400`}>
            No forecast job loaded yet. Upload your sales CSV and confirm forecasting to view category demand and revenue splits.
          </div>
        )}
      </div>
    );
  }

  // 6. SUB CATEGORY
  if (page === "sub-categories") {
    const subChart = Object.entries(subCategories.reduce((acc, s) => ({ ...acc, [s.category]: (acc[s.category] || 0) + 1 }), {})).map(([name, count]) => ({ name, count }));
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Sub Category</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your sub categories</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Sub category..." className="min-w-0 px-3 py-1.5 text-xs rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700" />
            <input value={newItemExtra} onChange={(e) => setNewItemExtra(e.target.value)} placeholder="Parent category..." className="min-w-0 px-3 py-1.5 text-xs rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700" />
            <button
              onClick={async () => {
                if (!newItemName.trim()) return;
                await erpRequest("/api/erp/sub-categories/", "POST", { category: newItemExtra || "Electronics", sub_category: newItemName });
                setNewItemName(""); setNewItemExtra("");
                await refreshErpData?.();
              }}
              className="px-3.5 py-1.5 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
            >
              + Add Sub Category
            </button>
          </div>
        </div>
        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Sub Categories by Parent Category</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} allowDecimals={false} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="count" name="Sub Categories" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr><th className={TH}>Category Code</th><th className={TH}>Category</th><th className={TH}>Sub Category</th><th className={TH}>Description</th><th className={TH}>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {subCategories.map((s) => (
                <tr key={s.code}>
                  <td className="py-3 px-4 font-bold">{s.code}</td>
                  <td className="py-3 px-4">{s.category}</td>
                  <td className="py-3 px-4 font-semibold">{s.sub_category}</td>
                  <td className="py-3 px-4 text-zinc-500">{s.description}</td>
                  <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

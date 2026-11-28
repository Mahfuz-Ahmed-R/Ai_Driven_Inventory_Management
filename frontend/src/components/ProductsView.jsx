import { useMemo, useState } from "react";
import { Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import DataTable from "./ui/DataTable";
import ProductDetailModal from "./ProductDetailModal";
import {
  hasRealStockData,
  hasRealPriceData,
  getSkuHistAvg,
  getSkuTrendPct,
  classifyInventoryStatus,
} from "../utils/forecastMetrics";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";

export default function ProductsView({ job, erpData, searchQuery, darkMode, onNavigate }) {
  const [selectedSku, setSelectedSku] = useState(null);

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);
  const rawSkus = useMemo(() => (job?.skus?.length ? job.skus : erpData?.products || []), [job, erpData?.products]);

  const rows = useMemo(() => {
    return rawSkus.map((s) => {
      const histAvg = getSkuHistAvg(s);
      const trendPct = getSkuTrendPct(s);
      const inv = classifyInventoryStatus(s, realStock || !job);
      return {
        ...s,
        hist_avg: histAvg,
        trend_pct: trendPct,
        inv_status: inv.label,
        inv_cls: inv.cls,
      };
    });
  }, [rawSkus, realStock, job]);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category || "General"))), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.inv_status))), [rows]);

  if (rows.length === 0) {
    return (
      <div className={`${CARD} p-10 text-center space-y-3`}>
        <Package className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">No Products Discovered Yet</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload a sales CSV in Data Management to discover products, demand trends, and inventory statuses.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.("upload")}
          className="px-4 py-2 rounded-[8px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
        >
          Go to Data Management
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Products &amp; SKU Analytics</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {rows.length} products discovered from your business data • Click any product for full forecast &amp; inventory details
          </p>
        </div>
      </div>

      <DataTable
        data={rows}
        rowKey="sku"
        persistKey="products_analytics_table"
        externalSearch={searchQuery}
        searchPlaceholder="Filter by Product ID (SKU) or Name..."
        onRowClick={(row) => setSelectedSku(row)}
        exportFilename="products_analytics.csv"
        filters={[
          { key: "category", label: "Category", options: categories },
          { key: "inv_status", label: "Status", options: statuses },
        ]}
        columns={[
          {
            key: "sku",
            label: "Product ID",
            sortable: true,
            render: (s) => <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">{s.sku}</span>,
          },
          {
            key: "product_name",
            label: "Product Name",
            sortable: true,
            render: (s) => <span className="font-semibold text-zinc-950 dark:text-white">{s.product_name}</span>,
          },
          {
            key: "category",
            label: "Category",
            sortable: true,
            render: (s) => <span className="text-zinc-500 dark:text-zinc-400">{s.category}</span>,
          },
          {
            key: "current_stock",
            label: "Current Stock",
            sortable: true,
            align: "right",
            render: (s) =>
              realStock || !job ? (
                <span className="font-semibold tabular-nums">{s.current_stock}</span>
              ) : (
                <span className="text-zinc-400 text-[11px]">Unavailable</span>
              ),
          },
          {
            key: "hist_avg",
            label: "Avg Daily Sales",
            sortable: true,
            align: "right",
            render: (s) => <span className="tabular-nums">{s.hist_avg} /d</span>,
          },
          {
            key: "total_28d_demand",
            label: "Forecasted (28D)",
            sortable: true,
            align: "right",
            render: (s) => <span className="font-semibold tabular-nums text-[#0F766E] dark:text-[#14B8A6]">{s.total_28d_demand} u</span>,
          },
          {
            key: "price",
            label: "Selling Price",
            sortable: true,
            align: "right",
            render: (s) =>
              realPrice || !job ? (
                <span className="tabular-nums">${Number(s.price || 0).toFixed(2)}</span>
              ) : (
                <span className="text-zinc-400 text-[11px]">Unavailable</span>
              ),
          },
          {
            key: "trend_pct",
            label: "Demand Trend",
            sortable: true,
            align: "right",
            render: (s) => (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                  s.trend_pct > 3
                    ? "text-emerald-600 dark:text-emerald-400"
                    : s.trend_pct < -3
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-500"
                }`}
              >
                {s.trend_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.trend_pct >= 0 ? `+${s.trend_pct}%` : `${s.trend_pct}%`}
              </span>
            ),
          },
          {
            key: "inv_status",
            label: "Inventory Status",
            sortable: true,
            align: "center",
            render: (s) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.inv_cls}`}>{s.inv_status}</span>,
          },
        ]}
      />

      <ProductDetailModal
        sku={selectedSku}
        job={job}
        horizon={28}
        darkMode={darkMode}
        onClose={() => setSelectedSku(null)}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Boxes,
  AlertTriangle,
  DollarSign,
  PackageX,
  Archive,
  TrendingDown,
  Flame,
  Info,
} from "lucide-react";
import DataTable from "./ui/DataTable";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import ProductDetailModal from "./ProductDetailModal";
import {
  hasRealStockData,
  hasRealPriceData,
  classifyInventoryStatus,
  getSkuTrendPct,
  getSkuHistAvg,
} from "../utils/forecastMetrics";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";

export default function InventoryView({ job, searchQuery, darkMode, onNavigate }) {
  const [selectedSku, setSelectedSku] = useState(null);

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);
  const skus = job?.skus || [];

  const { rows, kpis, insights } = useMemo(() => {
    const mapped = skus.map((s) => {
      const status = classifyInventoryStatus(s, realStock);
      const trendPct = getSkuTrendPct(s);
      const histAvg = getSkuHistAvg(s);
      return {
        ...s,
        status_key: status.key,
        status_label: status.label,
        status_cls: status.cls,
        trend_pct: trendPct,
        hist_avg: histAvg,
      };
    });

    const totalProducts = mapped.length;
    const totalUnits = mapped.reduce((a, s) => a + Number(s.current_stock || 0), 0);
    const totalValue = mapped.reduce((a, s) => a + Number(s.current_stock || 0) * Number(s.price || 0), 0);
    const lowStockCount = mapped.filter((s) => s.status_key === "low" || s.status_key === "critical").length;
    const outOfStockCount = mapped.filter((s) => s.status_key === "out_of_stock").length;
    const excessCount = mapped.filter((s) => s.status_key === "excess").length;

    const approachingStockout = mapped
      .filter((s) => s.status_key === "critical" || s.status_key === "low" || s.status_key === "out_of_stock")
      .sort((a, b) => a.days_left - b.days_left)
      .slice(0, 5);

    const excessiveList = mapped
      .filter((s) => s.status_key === "excess")
      .sort((a, b) => b.days_left - a.days_left)
      .slice(0, 5);

    const decliningDemand = mapped
      .filter((s) => s.trend_pct < -5)
      .sort((a, b) => a.trend_pct - b.trend_pct)
      .slice(0, 5);

    const highDemandSurge = mapped
      .filter((s) => s.trend_pct > 15)
      .sort((a, b) => b.trend_pct - a.trend_pct)
      .slice(0, 5);

    return {
      rows: mapped,
      kpis: {
        totalProducts,
        totalUnits: Math.round(totalUnits),
        totalValue: Number(totalValue.toFixed(2)),
        lowStockCount,
        outOfStockCount,
        excessCount,
      },
      insights: {
        approachingStockout,
        excessiveList,
        decliningDemand,
        highDemandSurge,
      },
    };
  }, [skus, realStock]);

  if (!job) {
    return (
      <div className={`${CARD} p-10 text-center space-y-3`}>
        <Boxes className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">No Inventory Position Available</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload your sales &amp; stock CSV in Data Management to view inventory levels, safety stock, and stockout risks.
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

  const statuses = Array.from(new Set(rows.map((r) => r.status_label)));
  const categories = Array.from(new Set(rows.map((r) => r.category)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Inventory Management</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Actual on-hand stock position, safety buffers, reorder points, and stock health diagnostics
        </p>
      </div>

      {!realStock && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-[8px] bg-amber-500/8 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Actual Current Stock Data Unavailable:</strong> Your uploaded CSV did not contain an on-hand stock column.
            Predicted future sales are never treated as current inventory. Upload a CSV with a <code className="font-mono">current_stock</code> column to unlock live stock counts, inventory valuation, and stockout alerts.
          </div>
        </div>
      )}

      {/* 6 Inventory KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Products</div>
          <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
            <AnimatedNumber value={kpis.totalProducts} />
          </div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Units in Stock</div>
          <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
            {realStock ? <AnimatedNumber value={kpis.totalUnits} /> : <span className="text-sm text-zinc-400">Unavailable</span>}
          </div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Inventory Value</div>
          <div className="text-xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-1">
            {realStock && realPrice ? (
              <AnimatedNumber value={kpis.totalValue} prefix="$" />
            ) : (
              <span className="text-sm text-zinc-400">Unavailable</span>
            )}
          </div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Low &amp; Critical Stock</div>
          <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {realStock ? <AnimatedNumber value={kpis.lowStockCount} /> : <span className="text-sm text-zinc-400">Unavailable</span>}
          </div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Out-of-Stock Products</div>
          <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
            {realStock ? <AnimatedNumber value={kpis.outOfStockCount} /> : <span className="text-sm text-zinc-400">Unavailable</span>}
          </div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Excess Inventory</div>
          <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-1">
            {realStock ? <AnimatedNumber value={kpis.excessCount} /> : <span className="text-sm text-zinc-400">Unavailable</span>}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <DataTable
        data={rows}
        rowKey="sku"
        persistKey="inventory_management_table"
        externalSearch={searchQuery}
        searchPlaceholder="Search product or SKU..."
        onRowClick={(row) => setSelectedSku(row)}
        exportFilename="inventory_position.csv"
        filters={[
          { key: "category", label: "Category", options: categories },
          { key: "status_label", label: "Status", options: statuses },
        ]}
        columns={[
          {
            key: "product_name",
            label: "Product",
            sortable: true,
            render: (s) => (
              <div>
                <div className="font-semibold text-zinc-950 dark:text-white">{s.product_name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">{s.sku} • {s.category}</div>
              </div>
            ),
          },
          {
            key: "current_stock",
            label: "Current Stock",
            sortable: true,
            align: "right",
            render: (s) =>
              realStock ? (
                <span className="font-bold tabular-nums">{s.current_stock} u</span>
              ) : (
                <span className="text-zinc-400 text-[11px]">Unavailable</span>
              ),
          },
          {
            key: "safety_stock",
            label: "Safety Stock",
            sortable: true,
            align: "right",
            render: (s) => <span className="tabular-nums">{s.safety_stock} u</span>,
          },
          {
            key: "reorder_point",
            label: "Reorder Point",
            sortable: true,
            align: "right",
            render: (s) => <span className="tabular-nums font-medium">{s.reorder_point} u</span>,
          },
          {
            key: "status_label",
            label: "Status",
            sortable: true,
            align: "center",
            render: (s) => <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.status_cls}`}>{s.status_label}</span>,
          },
        ]}
      />

      {/* Inventory Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Approaching Stockout */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Products Approaching Stockout
          </div>
          {!realStock ? (
            <p className="text-xs text-zinc-500">Requires actual current stock data.</p>
          ) : insights.approachingStockout.length === 0 ? (
            <p className="text-xs text-zinc-500">No products are currently approaching stockout.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {insights.approachingStockout.map((s) => (
                <div key={s.sku} className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedSku(s)}>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.product_name}</div>
                    <div className="text-zinc-500">{s.current_stock} on hand • ROP {s.reorder_point}</div>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400 shrink-0 tabular-nums">{s.days_left}d left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Excessive Inventory */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white mb-3">
            <Archive className="w-4 h-4 text-blue-500" /> Products with Excessive Inventory
          </div>
          {!realStock ? (
            <p className="text-xs text-zinc-500">Requires actual current stock data.</p>
          ) : insights.excessiveList.length === 0 ? (
            <p className="text-xs text-zinc-500">No products have excessive inventory (&ge;60 days cover).</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {insights.excessiveList.map((s) => (
                <div key={s.sku} className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedSku(s)}>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.product_name}</div>
                    <div className="text-zinc-500">{s.current_stock} on hand • {s.hist_avg} u/day</div>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">{s.days_left}d cover</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Declining Demand */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white mb-3">
            <TrendingDown className="w-4 h-4 text-amber-500" /> Products with Declining Demand
          </div>
          {insights.decliningDemand.length === 0 ? (
            <p className="text-xs text-zinc-500">No products show significant declining demand (&lt;-5%).</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {insights.decliningDemand.map((s) => (
                <div key={s.sku} className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedSku(s)}>
                  <span className="font-semibold truncate">{s.product_name}</span>
                  <span className="font-bold text-red-600 dark:text-red-400 shrink-0 tabular-nums">{s.trend_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unusually High Demand */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white mb-3">
            <Flame className="w-4 h-4 text-emerald-500" /> Products with Unusually High Demand
          </div>
          {insights.highDemandSurge.length === 0 ? (
            <p className="text-xs text-zinc-500">No products show unusual demand surges (&gt;+15%).</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {insights.highDemandSurge.map((s) => (
                <div key={s.sku} className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-80" onClick={() => setSelectedSku(s)}>
                  <span className="font-semibold truncate">{s.product_name}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">+{s.trend_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

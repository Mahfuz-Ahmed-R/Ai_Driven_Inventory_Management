import { useMemo, useState } from "react";
import { ShoppingCart, AlertTriangle, CheckCircle2, Clock, Info, Download } from "lucide-react";
import DataTable from "./ui/DataTable";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import ProductDetailModal from "./ProductDetailModal";
import {
  hasRealStockData,
  hasRealPriceData,
  classifyReplenishmentPriority,
} from "../utils/forecastMetrics";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";

export default function ReplenishmentView({ job, searchQuery, darkMode, onNavigate }) {
  const [selectedSku, setSelectedSku] = useState(null);

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);
  const leadTimeDays = Number(job?.lead_time_days || 0);
  const hasLeadTime = leadTimeDays > 0;
  const canGenerateOrders = Boolean(job && realStock && hasLeadTime);

  const skus = job?.skus || [];

  const { rows, summary } = useMemo(() => {
    if (!canGenerateOrders) {
      return {
        rows: [],
        summary: { urgent: 0, high: 0, normal: 0, totalUnits: 0, totalCost: 0 },
      };
    }

    const mapped = skus.map((s) => {
      const priority = classifyReplenishmentPriority(s);
      return {
        ...s,
        priority_key: priority.key,
        priority_label: priority.label,
        priority_cls: priority.cls,
        lead_time_days: leadTimeDays,
      };
    });

    const urgent = mapped.filter((r) => r.priority_key === "urgent").length;
    const high = mapped.filter((r) => r.priority_key === "high").length;
    const normal = mapped.filter((r) => r.priority_key === "normal").length;
    const totalUnits = mapped.reduce((a, r) => a + Number(r.suggested_order_qty || 0), 0);
    const totalCost = mapped.reduce((a, r) => a + Number(r.order_cost || 0), 0);

    return {
      rows: mapped,
      summary: {
        urgent,
        high,
        normal,
        totalUnits,
        totalCost: Number(totalCost.toFixed(2)),
      },
    };
  }, [skus, canGenerateOrders, leadTimeDays]);

  if (!job) {
    return (
      <div className={`${CARD} p-10 text-center space-y-3`}>
        <ShoppingCart className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">No Replenishment Plan Available</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload a sales CSV with current stock quantities and supplier lead time to generate prioritized reorder recommendations.
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

  const missingFields = [];
  if (!realStock) missingFields.push("Current available inventory (current_stock column in CSV)");
  if (!hasLeadTime) missingFields.push("Supplier lead time (lead_time_days)");

  const categories = Array.from(new Set(rows.map((r) => r.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Replenishment &amp; Reorder Recommendations</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Reorder Point = Expected Demand During Lead Time ({leadTimeDays}d) + Safety Stock • Prioritized by stockout urgency
          </p>
        </div>

        {canGenerateOrders && (
          <a
            href={`/api/jobs/${job.id}/export-csv/`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] hover:border-[#0F766E] text-xs font-semibold text-zinc-900 dark:text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Reorder Plan (CSV)
          </a>
        )}
      </div>

      {!canGenerateOrders ? (
        <div className={`${CARD} p-6 border-l-4 border-l-amber-500 space-y-3`}>
          <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" /> Insufficient Data for Precise Reorder Recommendations
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            To prevent inaccurate purchasing decisions, reorder quantities are not generated when required inventory or supplier parameters are missing.
          </p>
          <div className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] text-xs space-y-1">
            <div className="font-semibold text-zinc-900 dark:text-white">Missing Information:</div>
            <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 space-y-0.5">
              {missingFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigate?.("upload")}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Upload Dataset with Stock
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("settings")}
              className="px-3.5 py-1.5 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Configure Lead Time in Settings
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Priority Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className={`${CARD} p-4`}>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Urgent Orders</div>
              <div className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
                <AnimatedNumber value={summary.urgent} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Immediate stockout risk</div>
            </div>

            <div className={`${CARD} p-4`}>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">High Priority</div>
              <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                <AnimatedNumber value={summary.high} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Below reorder point</div>
            </div>

            <div className={`${CARD} p-4`}>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Normal Replenishment</div>
              <div className="text-xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-1">
                <AnimatedNumber value={summary.normal} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Scheduled cycle order</div>
            </div>

            <div className={`${CARD} p-4`}>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Suggested Units</div>
              <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
                <AnimatedNumber value={summary.totalUnits} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Lead time: {leadTimeDays} days</div>
            </div>

            <div className={`${CARD} p-4`}>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Estimated Order Cost</div>
              {realPrice ? (
                <>
                  <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
                    <AnimatedNumber value={summary.totalCost} prefix="$" />
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Estimated PO budget</div>
                </>
              ) : (
                <div className="text-sm font-semibold text-zinc-400 mt-2">Unavailable (no cost/price)</div>
              )}
            </div>
          </div>

          {/* Reorder Recommendation Table */}
          <DataTable
            data={rows}
            rowKey="sku"
            persistKey="replenishment_table"
            externalSearch={searchQuery}
            searchPlaceholder="Search product or SKU..."
            onRowClick={(row) => setSelectedSku(row)}
            exportFilename={`reorder_recommendations_${job.id}.csv`}
            filters={[
              {
                key: "priority_label",
                label: "Priority",
                options: ["Urgent", "High Priority", "Normal", "No Action Required"],
              },
              { key: "category", label: "Category", options: categories },
            ]}
            columns={[
              {
                key: "product_name",
                label: "Product",
                sortable: true,
                render: (s) => (
                  <div>
                    <div className="font-semibold text-zinc-950 dark:text-white">{s.product_name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {s.sku} • Safety Stock: {s.safety_stock}u • Lead Time: {s.lead_time_days}d
                    </div>
                  </div>
                ),
              },
              {
                key: "current_stock",
                label: "Current Stock",
                sortable: true,
                align: "right",
                render: (s) => <span className="font-semibold tabular-nums">{s.current_stock} u</span>,
              },
              {
                key: "total_28d_demand",
                label: "Forecasted Demand",
                sortable: true,
                align: "right",
                render: (s) => <span className="tabular-nums">{s.total_28d_demand} u</span>,
              },
              {
                key: "reorder_point",
                label: "Reorder Point",
                sortable: true,
                align: "right",
                render: (s) => <span className="tabular-nums font-medium">{s.reorder_point} u</span>,
              },
              {
                key: "suggested_order_qty",
                label: "Suggested Order",
                sortable: true,
                align: "right",
                render: (s) => (
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6]">
                      {s.suggested_order_qty > 0 ? `${s.suggested_order_qty} units` : "—"}
                    </div>
                    {realPrice && s.order_cost > 0 && (
                      <div className="text-[10px] text-zinc-500 tabular-nums">${Number(s.order_cost).toLocaleString()}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "run_out_date",
                label: "Est. Stockout / Reorder By",
                sortable: true,
                render: (s) => (
                  <div className="text-xs">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{s.run_out_date}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Order by: {s.reorder_by}
                    </div>
                  </div>
                ),
              },
              {
                key: "priority_label",
                label: "Priority",
                sortable: true,
                align: "center",
                render: (s) => <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.priority_cls}`}>{s.priority_label}</span>,
              },
            ]}
          />
        </>
      )}

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

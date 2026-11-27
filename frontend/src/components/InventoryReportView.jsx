import { useMemo, useState } from "react";
import { Download, FileText, Printer, X, Lock } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import DataTable from "./ui/DataTable";
import { useSaas } from "../context/SaasContext";

const URGENCY_BADGE = {
  critical: { label: "CRITICAL", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30" },
  watch: { label: "WATCH", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
  healthy: { label: "HEALTHY", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  overstock: { label: "OVERSTOCK", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" },
};

export default function InventoryReportView({ job, searchQuery, darkMode }) {
  const [selectedSku, setSelectedSku] = useState(null);
  const { hasFeature, openUpgradeModal } = useSaas();

  const skus = job?.skus || [];
  const categories = useMemo(
    () => Array.from(new Set(skus.map((s) => s.category))),
    [skus]
  );

  const canExportPdf = hasFeature("pdf_export");

  if (!job) {
    return (
      <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
        Upload a CSV to view the Inventory & Replenishment Report.
      </div>
    );
  }

  const skuChartData = selectedSku
    ? [
        ...(selectedSku.forecast_payload?.history_dates || []).map((d, i) => ({
          date: d,
          actual: selectedSku.forecast_payload.history_sales[i],
          forecast: null,
        })),
        ...(selectedSku.forecast_payload?.forecast_dates || []).map((d, i) => ({
          date: d,
          actual: null,
          forecast: selectedSku.forecast_payload.forecast_sales[i],
        })),
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Inventory & Replenishment Report</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dashboard &gt; Inventory Report • Click any SKU row for Digital Twin simulation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canExportPdf ? (
            <a
              href={`/api/jobs/${job.id}/pdf/`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 text-xs font-semibold text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={() => openUpgradeModal("PDF Executive Reports require the Basic plan or higher.")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E222D] border border-amber-500/40 text-xs font-semibold text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> PDF (Basic+)
            </button>
          )}
          <a
            href={`/api/jobs/${job.id}/export-csv/`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 text-xs font-semibold text-emerald-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-[#0F766E] hover:text-white hover:border-[#0F766E] transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <DataTable
        data={skus}
        rowKey="sku"
        persistKey="inventory_report"
        externalSearch={searchQuery}
        searchPlaceholder="Search SKU or product name..."
        onRowClick={(row) => setSelectedSku(row)}
        exportFilename={`replenishment_plan_${job.id}.csv`}
        filters={[
          { key: "category", label: "Category", options: categories },
          { key: "urgency", label: "Urgency", options: ["critical", "watch", "healthy", "overstock"] },
        ]}
        columns={[
          { key: "sku", label: "SKU", sortable: true, render: (s) => <span className="font-semibold text-zinc-950 dark:text-white">{s.sku}</span> },
          { key: "product_name", label: "Product Name", sortable: true },
          { key: "category", label: "Category", sortable: true, render: (s) => <span className="text-zinc-500 dark:text-zinc-400">{s.category}</span> },
          { key: "current_stock", label: "In Stock", sortable: true, align: "right" },
          { key: "avg_daily_velocity", label: "Velocity/Day", sortable: true, align: "right" },
          { key: "days_left", label: "Days Left", sortable: true, align: "right", render: (s) => <span className="font-bold">{s.days_left}d</span> },
          { key: "run_out_date", label: "Run-Out Date", sortable: true },
          {
            key: "suggested_order_qty",
            label: "Suggested Order",
            sortable: true,
            align: "right",
            render: (s) => <span className="font-bold">{s.suggested_order_qty > 0 ? `${s.suggested_order_qty} units` : "—"}</span>,
          },
          {
            key: "order_cost",
            label: "Order Cost",
            sortable: true,
            align: "right",
            render: (s) => (s.order_cost > 0 ? `$${s.order_cost.toLocaleString()}` : "—"),
          },
          {
            key: "urgency",
            label: "Urgency",
            sortable: true,
            align: "center",
            render: (s) => {
              const badge = URGENCY_BADGE[s.urgency] || URGENCY_BADGE.healthy;
              return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>;
            },
          },
        ]}
      />

      {/* SKU Digital Twin Detail Modal */}
      {selectedSku && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141417] border border-zinc-200 dark:border-zinc-800 rounded-[12px] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                  {selectedSku.product_name} ({selectedSku.sku})
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Method: {selectedSku.method} • Reorder Point: {selectedSku.reorder_point} units • Safety Stock:{" "}
                  {selectedSku.safety_stock} units
                </p>
              </div>
              <button
                onClick={() => setSelectedSku(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-[8px] p-4">
                <h3 className="text-xs font-bold text-zinc-950 dark:text-white mb-2">28-Day Demand Forecast</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={skuChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717A" }} minTickGap={20} />
                      <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                      <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                      <Line type="monotone" dataKey="actual" name="Historical" stroke="#64748B" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="forecast" name="AI Forecast" stroke="#FE9F43" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-[8px] p-4">
                <h3 className="text-xs font-bold text-zinc-950 dark:text-white mb-2">
                  Digital Twin Sawtooth Inventory Simulation
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedSku.sawtooth_payload || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717A" }} minTickGap={16} />
                      <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                      <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                      <ReferenceLine y={selectedSku.reorder_point} stroke="#EF4444" strokeDasharray="4 4" />
                      <Area
                        type="monotone"
                        dataKey="on_hand"
                        name="Simulated On-Hand"
                        stroke="#0E9384"
                        fill="#0E9384"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

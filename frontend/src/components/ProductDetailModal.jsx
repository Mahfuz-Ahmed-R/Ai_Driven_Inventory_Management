import { useMemo } from "react";
import { X, TrendingUp, TrendingDown, Package, AlertTriangle, ShieldCheck, ShoppingCart } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import {
  getSkuHorizonStats,
  classifyInventoryStatus,
  hasRealStockData,
  hasRealPriceData,
} from "../utils/forecastMetrics";

export default function ProductDetailModal({ sku, job, horizon = 28, darkMode, onClose }) {
  if (!sku) return null;

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);
  const stats = useMemo(() => getSkuHorizonStats(sku, horizon), [sku, horizon]);
  const invStatus = useMemo(() => classifyInventoryStatus(sku, realStock), [sku, realStock]);
  const backtest = job?.dataset_meta?.backtest;
  const gridStroke = darkMode ? "#262A34" : "#E5E3DC";

  const dailyChartData = useMemo(() => {
    const payload = sku.forecast_payload || {};
    const hDates = payload.history_dates || [];
    const hSales = payload.history_sales || [];
    const histPts = hDates.slice(-60).map((d, idx) => {
      const realIdx = Math.max(0, hDates.length - 60) + idx;
      return {
        date: d,
        actual: hSales[realIdx] ?? 0,
        forecast: null,
        uncertaintyBand: null,
      };
    });
    const fcstPts = stats.fDates.map((d, idx) => ({
      date: d,
      actual: null,
      forecast: stats.fSales[idx] ?? 0,
      uncertaintyBand:
        stats.fLower[idx] != null && stats.fUpper[idx] != null
          ? [stats.fLower[idx], stats.fUpper[idx]]
          : null,
    }));
    return [...histPts, ...fcstPts];
  }, [sku, stats]);

  const monthlyTrendData = useMemo(() => {
    const payload = sku.forecast_payload || {};
    const hDates = payload.history_dates || [];
    const hSales = payload.history_sales || [];
    const monthMap = {};
    hDates.forEach((d, idx) => {
      const m = String(d).slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { month: m, units: 0, days: 0 };
      monthMap[m].units += Number(hSales[idx] || 0);
      monthMap[m].days += 1;
    });
    return Object.values(monthMap).map((m) => ({
      month: m.month,
      units: Number(m.units.toFixed(1)),
      avgDaily: Number((m.units / Math.max(1, m.days)).toFixed(2)),
    }));
  }, [sku]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] rounded-[12px] max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E3DC] dark:border-[#262A34] pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white truncate">
                {sku.product_name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                {sku.sku}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${invStatus.cls}`}>
                {invStatus.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Category: <strong>{sku.category}</strong> • Store: <strong>{sku.store_id || "MAIN_STORE"}</strong> •{" "}
              {realPrice ? `Price: $${Number(sku.price || 0).toFixed(2)}` : "Price: Unavailable"} • Forecast Method: {sku.method}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="p-1.5 rounded-[6px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Key Product Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Historical Daily Avg</div>
            <div className="text-lg font-bold tabular-nums text-zinc-950 dark:text-white mt-0.5">
              {stats.histAvg} <span className="text-xs font-normal text-zinc-500">units/d</span>
            </div>
          </div>
          <div className="p-3.5 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Predicted ({horizon}D)</div>
            <div className="text-lg font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-0.5">
              {stats.predictedTotal} <span className="text-xs font-normal text-zinc-500">units</span>
            </div>
          </div>
          <div className="p-3.5 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Demand Trend</div>
            <div className={`text-lg font-bold tabular-nums mt-0.5 flex items-center gap-1 ${stats.trendPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {stats.trendPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stats.trendPct >= 0 ? `+${stats.trendPct}%` : `${stats.trendPct}%`}
            </div>
          </div>
          <div className="p-3.5 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Current Stock</div>
            <div className="text-lg font-bold tabular-nums text-zinc-950 dark:text-white mt-0.5">
              {realStock ? `${sku.current_stock} units` : <span className="text-sm text-zinc-400">Unavailable</span>}
            </div>
          </div>
        </div>

        {/* Historical & Future Demand Forecast Chart */}
        <div className="p-4 rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Historical Sales &amp; {horizon}-Day Demand Forecast
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Observed sales (solid) vs predicted demand (dashed) with prediction intervals
              </p>
            </div>
            {backtest?.evaluated && (
              <span className="px-2.5 py-1 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] text-[11px] font-semibold">
                Backtest MAE: {backtest.lgb_mae ?? backtest.naive_mae} • RMSE: {backtest.lgb_rmse ?? backtest.naive_rmse}
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="uncertaintyBand"
                  name="Prediction Interval"
                  stroke="none"
                  fill={darkMode ? "#14B8A6" : "#0F766E"}
                  fillOpacity={0.14}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Historical Sales"
                  stroke="#64748B"
                  fill={darkMode ? "#334155" : "#CBD5E1"}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name={`Forecast (${horizon}D)`}
                  stroke={darkMode ? "#14B8A6" : "#0F766E"}
                  strokeWidth={2.25}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend + Inventory & Replenishment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 p-4 rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white mb-2">Monthly Sales Trend</h3>
            {monthlyTrendData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717A" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                    <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                    <Bar dataKey="units" name="Monthly Units" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500">No monthly history available.</div>
            )}
          </div>

          <div className="lg:col-span-6 p-4 rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] space-y-3">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">Inventory &amp; Replenishment Parameters</h3>
            {realStock ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318]">
                  <div className="text-zinc-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Safety Stock</div>
                  <div className="font-bold text-sm mt-0.5 tabular-nums">{sku.safety_stock} units</div>
                </div>
                <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318]">
                  <div className="text-zinc-500 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Reorder Point</div>
                  <div className="font-bold text-sm mt-0.5 tabular-nums">{sku.reorder_point} units</div>
                </div>
                <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318]">
                  <div className="text-zinc-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Stockout Risk</div>
                  <div className="font-bold text-sm mt-0.5 tabular-nums">
                    {sku.days_left}d cover ({sku.run_out_date})
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318]">
                  <div className="text-zinc-500 flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Suggested Order</div>
                  <div className="font-bold text-sm mt-0.5 tabular-nums text-[#0F766E] dark:text-[#14B8A6]">
                    {sku.suggested_order_qty > 0 ? `${sku.suggested_order_qty} units` : "No order needed"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded bg-amber-500/8 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold">Actual Current Stock Unavailable</div>
                <p>
                  This dataset did not include an on-hand stock column. Upload a dataset with current stock quantities to calculate exact reorder points, stockout dates, and suggested order quantities.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

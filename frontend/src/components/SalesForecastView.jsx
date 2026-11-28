import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
} from "lucide-react";
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
import DataTable from "./ui/DataTable";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import ProductDetailModal from "./ProductDetailModal";
import {
  getSupportedHorizons,
  hasRealPriceData,
  getSkuHorizonStats,
} from "../utils/forecastMetrics";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";

export default function SalesForecastView({ job, searchQuery, darkMode, onNavigate }) {
  const supportedHorizons = useMemo(() => getSupportedHorizons(job), [job]);
  const [horizon, setHorizon] = useState(28);
  const [selectedSku, setSelectedSku] = useState(null);

  useEffect(() => {
    if (supportedHorizons.length > 0 && !supportedHorizons.includes(horizon)) {
      setHorizon(supportedHorizons.includes(28) ? 28 : supportedHorizons[supportedHorizons.length - 1]);
    }
  }, [supportedHorizons, horizon]);

  const realPrice = hasRealPriceData(job);
  const skus = job?.skus || [];
  const backtest = job?.dataset_meta?.backtest || {};
  const gridStroke = darkMode ? "#262A34" : "#E5E3DC";

  // Aggregate trajectory for selected horizon
  const { chartData, summary } = useMemo(() => {
    const full = job?.aggregate_trajectory || [];
    const histPts = full.filter((p) => p.actual !== null && p.actual !== undefined);
    const fcstPts = full.filter((p) => p.forecast !== null && p.forecast !== undefined).slice(0, horizon);

    const data = [...histPts.slice(-Math.max(30, horizon)), ...fcstPts].map((pt) => ({
      ...pt,
      uncertaintyBand:
        pt.forecast_lower != null && pt.forecast_upper != null
          ? [pt.forecast_lower, pt.forecast_upper]
          : null,
    }));

    const totalUnits = fcstPts.reduce((acc, p) => acc + Number(p.forecast || 0), 0);
    const dailyAvg = fcstPts.length ? totalUnits / fcstPts.length : 0;
    const expectedRevenue = fcstPts.reduce((acc, p) => acc + Number(p.revenue_forecast || 0), 0);

    let peakDay = null;
    let lowDay = null;
    for (const p of fcstPts) {
      const val = Number(p.forecast || 0);
      if (!peakDay || val > peakDay.value) peakDay = { date: p.date, value: val };
      if (!lowDay || val < lowDay.value) lowDay = { date: p.date, value: val };
    }

    // Comparable historical period
    const compLen = Math.min(fcstPts.length, histPts.length);
    let changePct = null;
    if (compLen >= 3) {
      const histCompTotal = histPts.slice(-compLen).reduce((acc, p) => acc + Number(p.actual || 0), 0);
      const fcstCompTotal = fcstPts.slice(0, compLen).reduce((acc, p) => acc + Number(p.forecast || 0), 0);
      if (histCompTotal > 0) {
        changePct = Number((((fcstCompTotal - histCompTotal) / histCompTotal) * 100).toFixed(1));
      }
    }

    return {
      chartData: data,
      summary: {
        totalUnits: Number(totalUnits.toFixed(1)),
        dailyAvg: Number(dailyAvg.toFixed(2)),
        expectedRevenue: Number(expectedRevenue.toFixed(2)),
        peakDay,
        lowDay,
        changePct,
      },
    };
  }, [job, horizon]);

  const productRows = useMemo(() => {
    return skus.map((s) => {
      const h = getSkuHorizonStats(s, horizon);
      return {
        ...s,
        hist_avg: h.histAvg,
        forecast_avg: h.forecastAvg,
        predicted_total: h.predictedTotal,
        trend_pct: h.trendPct,
        trend_label: h.trendPct > 3 ? "Growing" : h.trendPct < -3 ? "Declining" : "Stable",
      };
    });
  }, [skus, horizon]);

  const categories = useMemo(() => Array.from(new Set(skus.map((s) => s.category))), [skus]);

  if (!job) {
    return (
      <div className={`${CARD} p-10 text-center space-y-3`}>
        <TrendingUp className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">No Sales Forecast Available</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload a historical sales CSV in Data Management to generate multi-horizon demand forecasts.
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
    <div className="space-y-6">
      {/* Header & Forecast Period Selection */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Sales Forecasting</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Multi-horizon demand predictions, uncertainty intervals, and product-level forecast breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Forecast Horizon:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-[#181B22] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
            {supportedHorizons.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
                  horizon === h
                    ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Predicted Units</div>
          <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
            <AnimatedNumber value={summary.totalUnits} />
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Next {horizon} days</div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Expected Daily Avg</div>
          <div className="text-xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
            <AnimatedNumber value={summary.dailyAvg} suffix=" /day" />
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Across {skus.length} products</div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Expected Revenue</div>
          {realPrice ? (
            <>
              <div className="text-xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-1">
                <AnimatedNumber value={summary.expectedRevenue} prefix="$" />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Projected gross sales</div>
            </>
          ) : (
            <div className="text-sm font-semibold text-zinc-400 mt-2">Unavailable (no prices)</div>
          )}
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Highest Predicted Day</div>
          <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.peakDay ? `${summary.peakDay.value} u` : "—"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{summary.peakDay?.date || "N/A"}</div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Lowest Predicted Day</div>
          <div className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {summary.lowDay ? `${summary.lowDay.value} u` : "—"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{summary.lowDay?.date || "N/A"}</div>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">vs. Comparable History</div>
          {summary.changePct !== null ? (
            <>
              <div className={`text-xl font-bold tabular-nums mt-1 ${summary.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {summary.changePct >= 0 ? `+${summary.changePct}%` : `${summary.changePct}%`}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Expected demand shift</div>
            </>
          ) : (
            <div className="text-sm font-semibold text-zinc-400 mt-2">Insufficient history</div>
          )}
        </div>
      </div>

      {/* Main Forecast Trajectory Chart + Backtest Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-9 ${CARD} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Historical Observations vs. {horizon}-Day Forecast
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Shaded band represents the model prediction interval (uncertainty bounds)
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] dark:text-[#14B8A6]">
              <Calendar className="w-3.5 h-3.5" /> {horizon}-Day Horizon
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={24} />
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

        {/* Backtest Accuracy & Model Confidence Card */}
        <div className={`lg:col-span-3 ${CARD} p-5 flex flex-col justify-between space-y-4`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] mb-2">
              <CheckCircle2 className="w-4 h-4" /> Forecast Accuracy
            </div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
              {backtest.selected_model || "Adaptive Forecaster"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {backtest.reason || "Evaluated on chronological holdout window."}
            </p>
          </div>

          {backtest.evaluated ? (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318] flex justify-between">
                <span className="text-zinc-500">Eval Window</span>
                <span className="font-semibold tabular-nums">{backtest.eval_days} days</span>
              </div>
              <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318] flex justify-between">
                <span className="text-zinc-500">LightGBM MAE / RMSE</span>
                <span className="font-semibold tabular-nums">{backtest.lgb_mae} / {backtest.lgb_rmse}</span>
              </div>
              <div className="p-2.5 rounded bg-[#F7F6F2] dark:bg-[#111318] flex justify-between">
                <span className="text-zinc-500">Baseline MAE / RMSE</span>
                <span className="font-semibold tabular-nums">{backtest.naive_mae} / {backtest.naive_rmse}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded bg-[#F7F6F2] dark:bg-[#111318] text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Activity className="w-4 h-4 shrink-0" />
              <span>Need ≥49 historical days for chronological holdout backtest.</span>
            </div>
          )}
        </div>
      </div>

      {/* Product-Level Forecasting Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Product-Level Demand Forecast</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click any product row to inspect its historical sales, {horizon}-day forecast, and monthly trends
            </p>
          </div>
        </div>

        <DataTable
          data={productRows}
          rowKey="sku"
          persistKey="sales_forecast_table"
          externalSearch={searchQuery}
          searchPlaceholder="Search product name or SKU..."
          onRowClick={(row) => setSelectedSku(row)}
          exportFilename={`sales_forecast_${horizon}d.csv`}
          filters={[
            { key: "category", label: "Category", options: categories },
            { key: "trend_label", label: "Trend", options: ["Growing", "Stable", "Declining"] },
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
              key: "hist_avg",
              label: "Historical Average",
              sortable: true,
              align: "right",
              render: (s) => <span className="tabular-nums">{s.hist_avg} /day</span>,
            },
            {
              key: "forecast_avg",
              label: "Forecast Average",
              sortable: true,
              align: "right",
              render: (s) => <span className="font-semibold tabular-nums text-[#0F766E] dark:text-[#14B8A6]">{s.forecast_avg} /day</span>,
            },
            {
              key: "predicted_total",
              label: `Predicted Total (${horizon}D)`,
              sortable: true,
              align: "right",
              render: (s) => <span className="font-bold tabular-nums">{s.predicted_total} units</span>,
            },
            {
              key: "trend_pct",
              label: "Trend",
              sortable: true,
              align: "right",
              render: (s) => (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                    s.trend_pct > 3
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : s.trend_pct < -3
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {s.trend_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.trend_pct >= 0 ? `+${s.trend_pct}%` : `${s.trend_pct}%`}
                </span>
              ),
            },
          ]}
        />
      </div>

      <ProductDetailModal
        sku={selectedSku}
        job={job}
        horizon={horizon}
        darkMode={darkMode}
        onClose={() => setSelectedSku(null)}
      />
    </div>
  );
}

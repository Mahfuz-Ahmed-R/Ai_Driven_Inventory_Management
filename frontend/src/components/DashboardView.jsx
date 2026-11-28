import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  SlidersHorizontal,
  Info,
  ArrowRight,
  Download,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useThrottledCallback } from "../hooks/useThrottle";
import { useSaas } from "../context/SaasContext";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import DateRangePicker, { normalizeDateString } from "./ui/DateRangePicker";
import {
  getSupportedHorizons,
  hasRealStockData,
  hasRealPriceData,
  getSkuHorizonStats,
  getSkuTrendPct,
  getSkuHistAvg,
} from "../utils/forecastMetrics";

const CHART_PALETTE = ["#0F766E", "#D97706", "#3B82F6", "#059669", "#64748B"];

export default function DashboardView({ job, onNavigate, darkMode, user }) {
  const supportedHorizons = useMemo(() => getSupportedHorizons(job), [job]);
  const [forecastHorizon, setForecastHorizon] = useState(28);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [trendMode, setTrendMode] = useState("units"); // "units" | "revenue"
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { saasState, setOnboardingOpen } = useSaas();

  useEffect(() => {
    if (supportedHorizons.length > 0 && !supportedHorizons.includes(forecastHorizon)) {
      setForecastHorizon(supportedHorizons.includes(28) ? 28 : supportedHorizons[supportedHorizons.length - 1]);
    }
  }, [supportedHorizons, forecastHorizon]);

  const onScroll = useThrottledCallback(() => {
    setShowScrollTop(window.scrollY > 360);
  }, 150);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const onboarding = saasState?.onboarding || {};
  const profile = onboarding.data || {};
  const isSetupCompleted = Boolean(onboarding.completed);
  const firstName = user?.first_name?.trim() || user?.name?.trim()?.split(/\s+/)[0] || "";

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);

  const skus = job?.skus || [];
  const kpis = job?.summary_kpis || {};

  // Build trajectory sliced by selected forecast horizon & date range
  const trajectoryData = useMemo(() => {
    const full = job?.aggregate_trajectory || [];
    const histPts = full.filter((p) => p.actual !== null && p.actual !== undefined);
    const fcstPts = full.filter((p) => p.forecast !== null && p.forecast !== undefined).slice(0, forecastHorizon);
    const combined = [...histPts.slice(-Math.max(30, forecastHorizon)), ...fcstPts].map((pt) => {
      const lo = pt.forecast_lower;
      const hi = pt.forecast_upper;
      return {
        ...pt,
        uncertaintyBand: lo != null && hi != null ? [lo, hi] : null,
      };
    });

    if (dateRange.from || dateRange.to) {
      return combined.filter((pt) => {
        const d = normalizeDateString(pt.date);
        if (dateRange.from && (!d || d < dateRange.from)) return false;
        if (dateRange.to && (!d || d > dateRange.to)) return false;
        return true;
      });
    }
    return combined;
  }, [job, forecastHorizon, dateRange]);

  // Compute horizon-aware KPIs from actual backend SKU payloads
  const computedMetrics = useMemo(() => {
    if (!job || skus.length === 0) {
      return {
        forecastedUnits: 0,
        expectedRevenue: 0,
        productsAtRisk: 0,
        criticalCount: 0,
        reorderCount: 0,
        inventoryValue: 0,
        avgDailySales: 0,
        salesGrowthPct: null,
      };
    }
    let forecastedUnits = 0;
    let expectedRevenue = 0;
    let inventoryValue = 0;
    let histDailySum = 0;

    for (const s of skus) {
      const h = getSkuHorizonStats(s, forecastHorizon);
      forecastedUnits += h.predictedTotal;
      expectedRevenue += h.expectedRevenue;
      inventoryValue += Number(s.current_stock || 0) * Number(s.price || 0);
      histDailySum += getSkuHistAvg(s);
    }

    const criticalCount = skus.filter((s) => s.urgency === "critical" || s.current_stock <= 0).length;
    const watchCount = skus.filter((s) => s.urgency === "watch").length;
    const productsAtRisk = criticalCount + watchCount;
    const reorderCount = skus.filter((s) => (s.suggested_order_qty || 0) > 0).length;

    // Period-over-period sales growth from historical points
    const histPts = (job.aggregate_trajectory || []).filter((p) => p.actual !== null && p.actual !== undefined);
    const win = Math.min(forecastHorizon, Math.floor(histPts.length / 2));
    let salesGrowthPct = typeof kpis.sales_growth_pct === "number" ? kpis.sales_growth_pct : null;
    if (win >= 3) {
      const recent = histPts.slice(-win).reduce((a, b) => a + Number(b.actual || 0), 0);
      const prev = histPts.slice(-2 * win, -win).reduce((a, b) => a + Number(b.actual || 0), 0);
      if (prev > 0) {
        salesGrowthPct = Number((((recent - prev) / prev) * 100).toFixed(1));
      }
    }

    const avgDailySales =
      typeof kpis.avg_daily_sales === "number" && kpis.avg_daily_sales > 0
        ? kpis.avg_daily_sales
        : Number(histDailySum.toFixed(1));

    return {
      forecastedUnits: Number(forecastedUnits.toFixed(1)),
      expectedRevenue: Number(expectedRevenue.toFixed(2)),
      productsAtRisk,
      criticalCount,
      reorderCount,
      inventoryValue: Number(inventoryValue.toFixed(2)),
      avgDailySales,
      salesGrowthPct,
    };
  }, [job, skus, forecastHorizon, kpis]);

  const { topSelling, lowestPerforming, demandMovers } = useMemo(() => {
    const withStats = skus.map((s) => ({
      ...s,
      ...getSkuHorizonStats(s, forecastHorizon),
      trendPct: getSkuTrendPct(s),
    }));
    const sortedByDemand = [...withStats].sort((a, b) => b.predictedTotal - a.predictedTotal);
    const sortedByTrend = [...withStats].sort((a, b) => b.trendPct - a.trendPct);
    return {
      topSelling: sortedByDemand.slice(0, 5),
      lowestPerforming: [...sortedByDemand].reverse().slice(0, 5),
      demandMovers: {
        growing: sortedByTrend.filter((x) => x.trendPct > 0).slice(0, 4),
        declining: [...sortedByTrend].reverse().filter((x) => x.trendPct < 0).slice(0, 4),
      },
    };
  }, [skus, forecastHorizon]);

  if (!job) {
    return (
      <div className="space-y-4">
        {!isSetupCompleted && (
          <div className="rounded-[8px] bg-[#0F766E]/8 dark:bg-[#14B8A6]/10 border border-[#0F766E]/25 dark:border-[#14B8A6]/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <SlidersHorizontal className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
              <span>
                <strong>Complete your workspace setup</strong> to personalize lead times, company defaults, and dashboard insights.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="px-3 py-1.5 rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Start setup
            </button>
          </div>
        )}
        <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
            {isSetupCompleted && firstName
              ? `Welcome, ${firstName} — Ready to Forecast`
              : "No Sales Dataset Loaded Yet"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {isSetupCompleted
              ? `Upload your ${profile.company_name || "company"}'s sales CSV in Data Management to generate demand forecasts, inventory risk alerts, and reorder recommendations.`
              : "Upload your historical sales CSV to generate demand forecasts, inventory alerts, and reorder recommendations."}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onNavigate("upload")}
              className="px-4 py-2 rounded-[8px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Upload Sales CSV
            </button>
            {isSetupCompleted && (
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="px-4 py-2 rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Edit Setup
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const criticalSkus = skus.filter((s) => s.urgency === "critical");
  const topCritical = criticalSkus[0];
  const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";
  const gridStroke = darkMode ? "#262A34" : "#E5E3DC";

  return (
    <div className="space-y-6">
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="fixed bottom-5 right-5 z-40 p-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md hover:bg-[#0F766E] hover:text-white transition cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
            Business Overview — {isSetupCompleted && profile.company_name ? profile.company_name : job.company_name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dataset: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{job.filename}</span> •{" "}
            {job.dataset_meta?.date_start} to {job.dataset_meta?.date_end} • {skus.length} products
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Forecast Period Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#181B22] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
            {supportedHorizons.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setForecastHorizon(h)}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition cursor-pointer ${
                  forecastHorizon === h
                    ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {h}D
              </button>
            ))}
          </div>

          <div className="px-2 py-1 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34]">
            <DateRangePicker value={dateRange} onChange={setDateRange} label="Date Filter" />
          </div>

          <a
            href={`/api/jobs/${job.id}/pdf/`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] hover:border-zinc-400 dark:hover:border-zinc-500 text-xs font-semibold text-zinc-950 dark:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </a>
        </div>
      </div>

      {/* Critical Stockout Alert Banner */}
      {realStock && topCritical && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-[6px] bg-red-500/8 border border-red-500/25 text-xs">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <Info className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>
              Critical risk: <strong className="text-red-600 dark:text-red-400">{topCritical.product_name}</strong> ({topCritical.sku}) has{" "}
              <strong className="tabular-nums">{topCritical.current_stock}</strong> units on hand and is projected to stock out in{" "}
              <strong className="text-red-600 dark:text-red-400 tabular-nums">{topCritical.days_left} days</strong> ({topCritical.run_out_date}).
            </span>
          </div>
          <button
            onClick={() => onNavigate("replenishment")}
            className="text-red-600 dark:text-red-400 font-semibold hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            Review Replenishment <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Missing Stock / Price Notice when applicable */}
      {(!realStock || !realPrice) && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[6px] bg-amber-500/8 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {!realStock && !realPrice
              ? "Your uploaded dataset did not include current stock or unit price columns. Inventory value and stockout risk metrics require actual stock and pricing data."
              : !realStock
              ? "Current stock quantities were not included in the uploaded CSV. Stockout risk and inventory value require actual stock data."
              : "Unit selling prices were not included in the uploaded CSV. Revenue and inventory valuation are unavailable."}
          </span>
        </div>
      )}

      {/* 6 Core Business KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Forecasted Sales */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Forecasted Sales ({forecastHorizon}D)
            </div>
            <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
              <AnimatedNumber value={computedMetrics.forecastedUnits} suffix=" units" />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {realPrice ? (
                <>Expected revenue: <strong className="text-zinc-800 dark:text-zinc-200">${computedMetrics.expectedRevenue.toLocaleString()}</strong></>
              ) : (
                "Revenue unavailable (no price column)"
              )}
            </div>
          </div>
          <TrendingUp className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
        </div>

        {/* 2. Products at Risk */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Products at Risk</div>
            {realStock ? (
              <>
                <div className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
                  <AnimatedNumber value={computedMetrics.productsAtRisk} suffix=" SKUs" />
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span className="text-red-600 dark:text-red-400 font-semibold">{computedMetrics.criticalCount} critical</span> •{" "}
                  <button onClick={() => onNavigate("inventory")} className="underline hover:text-[#0F766E] cursor-pointer">
                    Inspect inventory
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-zinc-400 dark:text-zinc-500 mt-1">Unavailable</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Requires current stock data</div>
              </>
            )}
          </div>
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        </div>

        {/* 3. Reorder Recommendations */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Reorder Recommendations</div>
            {realStock ? (
              <>
                <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
                  <AnimatedNumber value={computedMetrics.reorderCount} suffix=" products" />
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Lead time: {job.lead_time_days}d •{" "}
                  <button onClick={() => onNavigate("replenishment")} className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline cursor-pointer">
                    View orders →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-zinc-400 dark:text-zinc-500 mt-1">Unavailable</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Requires stock &amp; lead time</div>
              </>
            )}
          </div>
          <ShoppingCart className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        </div>

        {/* 4. Inventory Value */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Inventory Value</div>
            {realStock && realPrice ? (
              <>
                <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
                  <AnimatedNumber value={computedMetrics.inventoryValue} prefix="$" />
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Based on on-hand stock &amp; unit price
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-zinc-400 dark:text-zinc-500 mt-1">Unavailable</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {!realStock ? "Missing stock quantities" : "Missing unit cost/price"}
                </div>
              </>
            )}
          </div>
          <DollarSign className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
        </div>

        {/* 5. Sales Growth */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sales Growth (Period-over-Period)</div>
            {computedMetrics.salesGrowthPct !== null ? (
              <>
                <div
                  className={`text-2xl font-bold tabular-nums mt-1 ${
                    computedMetrics.salesGrowthPct >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {computedMetrics.salesGrowthPct >= 0 ? "+" : ""}
                  {computedMetrics.salesGrowthPct}%
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Recent period vs previous equivalent period
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-zinc-400 dark:text-zinc-500 mt-1">Unavailable</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Insufficient history for comparison</div>
              </>
            )}
          </div>
          {computedMetrics.salesGrowthPct !== null && computedMetrics.salesGrowthPct < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          ) : (
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          )}
        </div>

        {/* 6. Average Daily Sales */}
        <div className={`${CARD} p-5 flex items-start justify-between gap-3`}>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Average Daily Sales</div>
            <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
              <AnimatedNumber value={computedMetrics.avgDailySales} suffix=" units/day" />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Observed daily average across {skus.length} products
            </div>
          </div>
          <Activity className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Main Chart: Historical Sales vs Forecasted Sales + Uncertainty + Daily/Revenue Toggle */}
      <div className={`${CARD} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              {trendMode === "units" ? "Historical Sales vs. Forecasted Sales (Units)" : "Revenue Trend — Historical vs. Projected ($)"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Solid line: actual historical observations • Dashed teal: {forecastHorizon}-day forecast with prediction interval
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#F7F6F2] dark:bg-[#111318] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
            <button
              type="button"
              onClick={() => setTrendMode("units")}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition cursor-pointer ${
                trendMode === "units"
                  ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Daily Units
            </button>
            <button
              type="button"
              disabled={!realPrice}
              onClick={() => setTrendMode("revenue")}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                trendMode === "revenue"
                  ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              Revenue Trend
            </button>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {trendMode === "units" ? (
              <ComposedChart data={trajectoryData}>
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
                  name="Actual Sales (Observed)"
                  stroke="#64748B"
                  fill={darkMode ? "#334155" : "#CBD5E1"}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name={`Forecasted Sales (${forecastHorizon}D)`}
                  stroke={darkMode ? "#14B8A6" : "#0F766E"}
                  strokeWidth={2.25}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            ) : (
              <AreaChart data={trajectoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="revenue_actual"
                  name="Actual Revenue ($)"
                  stroke="#64748B"
                  fill={darkMode ? "#334155" : "#CBD5E1"}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="revenue_forecast"
                  name={`Projected Revenue (${forecastHorizon}D)`}
                  stroke={darkMode ? "#14B8A6" : "#0F766E"}
                  fill={darkMode ? "#14B8A6" : "#0F766E"}
                  fillOpacity={0.18}
                  strokeWidth={2.25}
                  strokeDasharray="5 4"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance & Daily Sales Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-7 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Product Category Performance</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Predicted demand &amp; revenue by category</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={job.category_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="demand_units" name="Predicted Units (28D)" fill="#0F766E" radius={[4, 4, 0, 0]} />
                {realPrice && <Bar dataKey="revenue" name="Est. Revenue ($)" fill="#D97706" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-5 ${CARD} p-5 flex flex-col justify-between`}>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white mb-1">Category Share</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Unit demand distribution</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={job.category_breakdown || []}
                    dataKey="demand_units"
                    nameKey="category"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={3}
                  >
                    {(job.category_breakdown || []).map((_, idx) => (
                      <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {(job.category_breakdown || []).map((c, idx) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }} />
                    <span className="font-medium">{c.category}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{c.demand_units} units ({c.sku_count} SKUs)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top-Selling, Lowest-Performing, and Demand Growth & Decline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top-Selling Products */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Top-Selling Products</h3>
            <button onClick={() => onNavigate("sales-forecast")} className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer">
              Forecasts →
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topSelling.map((s) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 dark:text-white truncate">{s.product_name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400 truncate">
                    {s.sku} • {s.category}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-[5px] bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0 tabular-nums">
                  {s.predictedTotal} units
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lowest-Performing Products */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Lowest-Performing Products</h3>
            <button onClick={() => onNavigate("products")} className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer">
              All products →
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lowestPerforming.map((s) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 dark:text-white truncate">{s.product_name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400 truncate">
                    {s.sku} • {s.category}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-[5px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold shrink-0 tabular-nums">
                  {s.predictedTotal} units
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Demand Growth & Decline */}
        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Demand Growth &amp; Decline</h3>
            <button onClick={() => onNavigate("analytics")} className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer">
              Analytics →
            </button>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Fastest Growing</div>
              {demandMovers.growing.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 py-1">No growing SKUs detected in current window.</div>
              ) : (
                demandMovers.growing.map((s) => (
                  <div key={s.sku} className="py-1 flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{s.product_name}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">+{s.trendPct}%</span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
              <div className="text-[11px] font-semibold uppercase text-red-600 dark:text-red-400 mb-1">Fastest Declining</div>
              {demandMovers.declining.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 py-1">No declining SKUs detected in current window.</div>
              ) : (
                demandMovers.declining.map((s) => (
                  <div key={s.sku} className="py-1 flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{s.product_name}</span>
                    <span className="font-bold text-red-600 dark:text-red-400 shrink-0 tabular-nums">{s.trendPct}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {job.gemini_executive_summary && (
        <div className={`${CARD} border-l-4 border-l-[#0F766E] dark:border-l-[#14B8A6] p-5`}>
          <div className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] mb-2">
            Executive Forecast Summary
          </div>
          <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
            {job.gemini_executive_summary}
          </div>
        </div>
      )}
    </div>
  );
}

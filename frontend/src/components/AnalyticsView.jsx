import { useMemo, useState } from "react";
import { BarChart3, Calendar, GitCompare, Layers, TrendingUp, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import DateRangePicker, { normalizeDateString } from "./ui/DateRangePicker";
import {
  hasRealStockData,
  hasRealPriceData,
  getSkuHistAvg,
  getSkuTrendPct,
} from "../utils/forecastMetrics";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";
const COMPARE_COLORS = ["#0F766E", "#D97706", "#3B82F6"];

export default function AnalyticsView({ job, darkMode, onNavigate }) {
  const [granularity, setGranularity] = useState("daily"); // "daily" | "weekly" | "monthly"
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [compareMode, setCompareMode] = useState("products"); // "products" | "categories"
  const [selectedSkus, setSelectedSkus] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);

  const realStock = hasRealStockData(job);
  const realPrice = hasRealPriceData(job);
  const skus = job?.skus || [];
  const gridStroke = darkMode ? "#262A34" : "#E5E3DC";

  // Default comparison selections
  const activeSkus = useMemo(() => {
    if (selectedSkus.length > 0) return selectedSkus;
    return skus.slice(0, 3).map((s) => s.sku);
  }, [selectedSkus, skus]);

  const categories = useMemo(() => Array.from(new Set(skus.map((s) => s.category))), [skus]);
  const activeCats = useMemo(() => {
    if (selectedCats.length > 0) return selectedCats;
    return categories.slice(0, 3);
  }, [selectedCats, categories]);

  // 1. Sales & Revenue Aggregation (Daily / Weekly / Monthly)
  const aggregatedSeries = useMemo(() => {
    const full = job?.aggregate_trajectory || [];
    const filtered = full.filter((pt) => {
      if (!dateRange.from && !dateRange.to) return true;
      const d = normalizeDateString(pt.date);
      if (dateRange.from && (!d || d < dateRange.from)) return false;
      if (dateRange.to && (!d || d > dateRange.to)) return false;
      return true;
    });

    if (granularity === "daily") {
      return filtered.map((pt) => ({
        label: pt.date,
        actual: pt.actual ?? 0,
        forecast: pt.forecast ?? null,
        revenue: pt.revenue_actual ?? pt.revenue_forecast ?? 0,
      }));
    }

    const buckets = {};
    for (const pt of filtered) {
      const d = String(pt.date);
      let key = d;
      if (granularity === "weekly") {
        const dt = new Date(d);
        if (!Number.isNaN(dt.getTime())) {
          const day = dt.getDay();
          const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(dt.setDate(diff));
          key = monday.toISOString().slice(0, 10);
        }
      } else if (granularity === "monthly") {
        key = d.slice(0, 7);
      }

      if (!buckets[key]) {
        buckets[key] = { label: key, actual: 0, forecast: 0, revenue: 0, hasActual: false, hasForecast: false };
      }
      if (pt.actual != null) {
        buckets[key].actual += Number(pt.actual);
        buckets[key].hasActual = true;
      }
      if (pt.forecast != null) {
        buckets[key].forecast += Number(pt.forecast);
        buckets[key].hasForecast = true;
      }
      buckets[key].revenue += Number(pt.revenue_actual ?? pt.revenue_forecast ?? 0);
    }

    return Object.values(buckets).map((b) => ({
      label: b.label,
      actual: b.hasActual ? Number(b.actual.toFixed(1)) : null,
      forecast: b.hasForecast ? Number(b.forecast.toFixed(1)) : null,
      revenue: Number(b.revenue.toFixed(2)),
    }));
  }, [job, granularity, dateRange]);

  // 2. Weekday vs Weekend Behavior & Seasonal Monthly Pattern
  const { weekdayPattern, seasonalPattern } = useMemo(() => {
    const histPts = (job?.aggregate_trajectory || []).filter((p) => p.actual != null);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayBuckets = dayNames.map((name) => ({ day: name, total: 0, count: 0 }));
    const monthBuckets = {};

    for (const pt of histPts) {
      const dt = new Date(pt.date);
      if (Number.isNaN(dt.getTime())) continue;
      const dow = dt.getDay();
      dayBuckets[dow].total += Number(pt.actual || 0);
      dayBuckets[dow].count += 1;

      const m = String(pt.date).slice(0, 7);
      if (!monthBuckets[m]) monthBuckets[m] = { month: m, units: 0, days: 0 };
      monthBuckets[m].units += Number(pt.actual || 0);
      monthBuckets[m].days += 1;
    }

    return {
      weekdayPattern: dayBuckets.map((b) => ({
        day: b.day,
        avgUnits: b.count > 0 ? Number((b.total / b.count).toFixed(1)) : 0,
      })),
      seasonalPattern: Object.values(monthBuckets).map((m) => ({
        month: m.month,
        avgDaily: Number((m.units / Math.max(1, m.days)).toFixed(1)),
        totalUnits: Number(m.units.toFixed(1)),
      })),
    };
  }, [job]);

  // 3. Inventory Analytics (Turnover, Days on Hand, Excess)
  const inventoryAnalytics = useMemo(() => {
    if (!realStock || skus.length === 0) return null;
    const totalStockUnits = skus.reduce((a, s) => a + Number(s.current_stock || 0), 0);
    const totalDailyDemand = skus.reduce((a, s) => a + Math.max(0.01, getSkuHistAvg(s)), 0);
    const daysOnHand = totalDailyDemand > 0 ? Number((totalStockUnits / totalDailyDemand).toFixed(1)) : 0;
    const annualizedSales = totalDailyDemand * 365;
    const turnover = totalStockUnits > 0 ? Number((annualizedSales / totalStockUnits).toFixed(2)) : 0;
    const excessSkus = skus.filter((s) => s.urgency === "overstock" || s.days_left >= 60).length;
    return { daysOnHand, turnover, excessSkus };
  }, [realStock, skus]);

  // 4. Comparison Tool Chart Data
  const comparisonData = useMemo(() => {
    if (skus.length === 0) return [];
    const first = skus[0];
    const hDates = (first.forecast_payload?.history_dates || []).slice(-28);
    const fDates = (first.forecast_payload?.forecast_dates || []).slice(0, 28);
    const allDates = [...hDates, ...fDates];

    if (compareMode === "products") {
      const selectedObjs = skus.filter((s) => activeSkus.includes(s.sku));
      return allDates.map((d, idx) => {
        const row = { date: d };
        const isHist = idx < hDates.length;
        for (const s of selectedObjs) {
          const hSlice = (s.forecast_payload?.history_sales || []).slice(-28);
          const fSlice = (s.forecast_payload?.forecast_sales || []).slice(0, 28);
          row[s.sku] = isHist ? hSlice[idx] ?? 0 : fSlice[idx - hDates.length] ?? 0;
        }
        return row;
      });
    }

    // Category comparison
    return allDates.map((d, idx) => {
      const row = { date: d };
      const isHist = idx < hDates.length;
      for (const cat of activeCats) {
        let sum = 0;
        for (const s of skus) {
          if (s.category !== cat) continue;
          const hSlice = (s.forecast_payload?.history_sales || []).slice(-28);
          const fSlice = (s.forecast_payload?.forecast_sales || []).slice(0, 28);
          sum += Number(isHist ? hSlice[idx] ?? 0 : fSlice[idx - hDates.length] ?? 0);
        }
        row[cat] = Number(sum.toFixed(1));
      }
      return row;
    });
  }, [skus, compareMode, activeSkus, activeCats]);

  const toggleItem = (list, setList, value) => {
    if (list.includes(value)) {
      if (list.length > 1) setList(list.filter((v) => v !== value));
    } else if (list.length < 3) {
      setList([...list, value]);
    }
  };

  if (!job) {
    return (
      <div className={`${CARD} p-10 text-center space-y-3`}>
        <BarChart3 className="w-8 h-8 text-[#0F766E] dark:text-[#14B8A6] mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">No Analytics Data Available</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Upload a sales CSV in Data Management to explore sales, demand seasonality, inventory turnover, and comparison analytics.
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
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Business &amp; Demand Analytics</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Deep-dive sales trends, weekday/seasonal patterns, inventory efficiency, and side-by-side comparisons
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-[#181B22] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
            {["daily", "weekly", "monthly"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold capitalize transition cursor-pointer ${
                  granularity === g
                    ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="px-2 py-1 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34]">
            <DateRangePicker value={dateRange} onChange={setDateRange} label="Date Range" />
          </div>
        </div>
      </div>

      {/* Section 1: Sales & Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-7 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white capitalize">{granularity} Sales Trend (Units)</h2>
              <p className="text-xs text-zinc-500">Observed sales vs. forecasted demand</p>
            </div>
            <Calendar className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="actual" name="Actual Units" stroke="#64748B" fill={darkMode ? "#334155" : "#CBD5E1"} fillOpacity={0.35} />
                <Area type="monotone" dataKey="forecast" name="Forecasted Units" stroke="#0F766E" fill="#0F766E" fillOpacity={0.2} strokeDasharray="5 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-5 ${CARD} p-5`}>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-1 capitalize">{granularity} Revenue Trend</h2>
          <p className="text-xs text-zinc-500 mb-3">Historical &amp; projected revenue ($)</p>
          {realPrice ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
              Revenue analytics unavailable (no unit selling prices in dataset).
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Demand Analytics (Weekday vs Weekend & Seasonal Monthly Pattern) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-6 ${CARD} p-5`}>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-1">Weekday vs. Weekend Demand Behavior</h2>
          <p className="text-xs text-zinc-500 mb-3">Average daily units sold by day of week</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="avgUnits" name="Avg Units/Day" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-6 ${CARD} p-5`}>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-1">Monthly &amp; Seasonal Demand Pattern</h2>
          <p className="text-xs text-zinc-500 mb-3">Average daily demand across observed months</p>
          {seasonalPattern.length >= 2 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonalPattern}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Line type="monotone" dataKey="avgDaily" name="Avg Daily Units" stroke="#3B82F6" strokeWidth={2.25} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-zinc-500">
              At least 2 months of historical data are needed to display seasonal patterns.
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Inventory Analytics */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Inventory Efficiency Analytics</h2>
        </div>
        {inventoryAnalytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318]">
              <div className="text-[11px] text-zinc-500">Annualized Inventory Turnover</div>
              <div className="text-xl font-bold tabular-nums mt-1">{inventoryAnalytics.turnover}x</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Based on observed daily velocity</div>
            </div>
            <div className="p-4 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318]">
              <div className="text-[11px] text-zinc-500">Days of Inventory on Hand</div>
              <div className="text-xl font-bold tabular-nums mt-1">{inventoryAnalytics.daysOnHand} days</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Aggregate stock coverage</div>
            </div>
            <div className="p-4 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318]">
              <div className="text-[11px] text-zinc-500">Excess Inventory SKUs</div>
              <div className="text-xl font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">{inventoryAnalytics.excessSkus}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">&ge;60 days of cover</div>
            </div>
            <div className="p-4 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318]">
              <div className="text-[11px] text-zinc-500">Historical Stockout Frequency</div>
              <div className="text-sm font-semibold text-zinc-400 mt-2">Unavailable</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Requires historical stock snapshots</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Inventory turnover and days-on-hand require a dataset with actual current stock quantities.</span>
          </div>
        )}
      </div>

      {/* Section 4: Comparison Tools */}
      <div className={`${CARD} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Interactive Comparison Tool</h2>
              <p className="text-xs text-zinc-500">Compare up to 3 products or categories across historical &amp; forecasted periods</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#F7F6F2] dark:bg-[#111318] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
            <button
              type="button"
              onClick={() => setCompareMode("products")}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer ${
                compareMode === "products" ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950" : "text-zinc-500"
              }`}
            >
              Compare Products
            </button>
            <button
              type="button"
              onClick={() => setCompareMode("categories")}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold cursor-pointer ${
                compareMode === "categories" ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950" : "text-zinc-500"
              }`}
            >
              Compare Categories
            </button>
          </div>
        </div>

        {/* Selector pills */}
        <div className="flex flex-wrap gap-1.5">
          {compareMode === "products"
            ? skus.slice(0, 15).map((s) => {
                const active = activeSkus.includes(s.sku);
                return (
                  <button
                    key={s.sku}
                    type="button"
                    onClick={() => toggleItem(activeSkus, setSelectedSkus, s.sku)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                      active
                        ? "bg-[#0F766E]/12 border-[#0F766E] text-[#0F766E] dark:text-[#14B8A6]"
                        : "border-[#E5E3DC] dark:border-[#262A34] text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {s.product_name} ({s.sku})
                  </button>
                );
              })
            : categories.map((cat) => {
                const active = activeCats.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleItem(activeCats, setSelectedCats, cat)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                      active
                        ? "bg-[#0F766E]/12 border-[#0F766E] text-[#0F766E] dark:text-[#14B8A6]"
                        : "border-[#E5E3DC] dark:border-[#262A34] text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
              <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {(compareMode === "products" ? activeSkus : activeCats).map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

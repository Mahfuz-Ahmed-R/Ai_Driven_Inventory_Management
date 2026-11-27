import { useEffect, useMemo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useThrottledCallback } from "../hooks/useThrottle";
import { useSaas } from "../context/SaasContext";
import {
  Package,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Layers,
  PiggyBank,
  ShoppingCart,
  SlidersHorizontal,
  Info,
  ArrowRight,
  Download,
  Users,
  Truck,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { AnimatedNumber, AnimatedProgressBar } from "./ui/AnimatedNumber";

const CHART_PALETTE = ["#0F766E", "#D97706", "#3B82F6", "#059669", "#64748B"];

export default function DashboardView({ job, erpData, onNavigate, darkMode, user }) {
  const [timeframe, setTimeframe] = useState("1M");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { saasState, setOnboardingOpen } = useSaas();

  const onScroll = useThrottledCallback(() => {
    setShowScrollTop(window.scrollY > 360);
  }, 150);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const trajectorySlice = useMemo(() => {
    const full = job?.aggregate_trajectory || [];
    if (timeframe === "1D") return full.slice(-7);
    if (timeframe === "1W") return full.slice(-14);
    if (timeframe === "1M") return full.slice(-30);
    if (timeframe === "3M") return full.slice(-60);
    return full;
  }, [job, timeframe]);

  const onboarding = saasState?.onboarding || {};
  const profile = onboarding.data || {};
  const isSetupCompleted = Boolean(onboarding.completed);
  const firstName = user?.first_name?.trim() || user?.name?.trim()?.split(/\s+/)[0] || "";

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
        <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
            {isSetupCompleted && firstName
              ? `Welcome, ${firstName} — Ready to Forecast`
              : "No Analysis Loaded Yet"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {isSetupCompleted
              ? `Upload your ${profile.company_name}'s sales CSV to generate forecasts and start optimizing for ${profile.primary_goal || "Reduce Stockouts"}.`
              : "Upload your sales CSV to generate forecasts and start optimizing for your primary goal."}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onNavigate("upload")}
              className="px-4 py-2 rounded-[8px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Go to CSV Upload
            </button>
            {isSetupCompleted && (
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="px-4 py-2 rounded-[8px] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Edit Setup
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const kpis = job.summary_kpis || {};
  const skus = job.skus || [];
  const criticalSkus = skus.filter((s) => s.urgency === "critical");
  const topMoving = [...skus].sort((a, b) => b.total_28d_demand - a.total_28d_demand).slice(0, 5);
  const lowStockList = [...skus].sort((a, b) => a.days_left - b.days_left).slice(0, 5);
  const recentSalesSkus = skus.slice(0, 5);
  const topCritical = criticalSkus[0];
  const piePalette = CHART_PALETTE;
  const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";

  const goalConfig = (() => {
    switch (profile.primary_goal) {
      case "Lower Holding Costs":
        return {
          title: "Holding Cost Optimization Focus",
          desc: `${kpis.overstock_count || 0} overstocked SKUs (>60d cover) • $${(kpis.cost_savings_vs_eoq || 0).toLocaleString()} AI savings vs. EOQ`,
          cta: "Review overstock",
          tab: "manage-stock",
        };
      case "Automate Purchase Orders":
        return {
          title: "Automated Replenishment Focus",
          desc: `$${(kpis.total_reorder_cost || 0).toLocaleString()} recommended PO budget • ${profile.default_lead_time || 4}d supplier lead time`,
          cta: "Open PO report",
          tab: "report",
        };
      case "Compare ML vs Heuristic Policies":
        return {
          title: "Policy Benchmark Focus",
          desc: `${kpis.ai_fill_rate || 98}% simulated AI fill rate • $${(kpis.cost_savings_vs_eoq || 0).toLocaleString()} lower cost vs. EOQ`,
          cta: "View benchmark",
          tab: "policy",
        };
      default:
        return {
          title: "Stockout Prevention Focus",
          desc: `${kpis.critical_count || 0} critical SKUs & ${kpis.watch_count || 0} watch SKUs requiring reorder attention`,
          cta: "View low stocks",
          tab: "low-stocks",
        };
    }
  })();

  return (
    <div className="space-y-6">
      {!isSetupCompleted ? (
        <div className="rounded-[8px] bg-[#0F766E]/8 dark:bg-[#14B8A6]/10 border border-[#0F766E]/25 dark:border-[#14B8A6]/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <SlidersHorizontal className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
            <span>
              <strong>Complete your workspace setup</strong> to tailor lead times and SKU forecasting defaults.
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
      ) : (
        <div className="rounded-[8px] bg-[#0F766E]/8 dark:bg-[#14B8A6]/10 border border-[#0F766E]/25 dark:border-[#14B8A6]/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-zinc-950 dark:text-white">
                {goalConfig.title}
                {profile.industry ? (
                  <span className="ml-2 text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                    ({profile.industry} • {profile.sku_scale || "50-500 SKUs"} • {profile.default_lead_time || 4}d lead time)
                  </span>
                ) : null}
              </div>
              <div className="text-zinc-600 dark:text-zinc-300 mt-0.5">{goalConfig.desc}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(goalConfig.tab)}
              className="px-3 py-1.5 rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              {goalConfig.cta}
            </button>
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="px-2.5 py-1.5 rounded-[6px] border border-[#0F766E]/30 dark:border-[#14B8A6]/30 text-[#0F766E] dark:text-[#14B8A6] text-xs font-semibold hover:bg-[#0F766E]/10 transition cursor-pointer"
            >
              Edit setup
            </button>
          </div>
        </div>
      )}
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
            Welcome, {isSetupCompleted && profile.company_name ? profile.company_name : job.company_name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dataset: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{job.filename}</span> •{" "}
            {job.dataset_meta?.date_start} to {job.dataset_meta?.date_end} ({kpis.total_skus || 0} SKUs)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>{job.dataset_meta?.date_start || "28D"} — {job.dataset_meta?.date_end || "Horizon"}</span>
          </div>
          <a
            href={`/api/jobs/${job.id}/pdf/`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] hover:border-zinc-400 dark:hover:border-zinc-500 text-xs font-semibold text-zinc-950 dark:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Report
          </a>
        </div>
      </div>

      {/* Notification Alert Banner */}
      {topCritical && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-[6px] bg-red-500/8 border border-red-500/25 text-xs">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <Info className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>
              Critical alert: <strong className="text-red-600 dark:text-red-400">{topCritical.product_name}</strong> ({topCritical.sku}) has{" "}
              <strong className="tabular-nums">{topCritical.current_stock}</strong> units left and stocks out in{" "}
              <strong className="text-red-600 dark:text-red-400 tabular-nums">{topCritical.days_left} days</strong> ({topCritical.run_out_date}).
            </span>
          </div>
          <button
            onClick={() => onNavigate("low-stocks")}
            className="text-red-600 dark:text-red-400 font-semibold hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            View low stocks <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Row 1: Unified 4-Metric Executive Strip */}
      <div className={`${CARD} grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E3DC] dark:divide-[#262A34]`}>
        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">28-day forecast demand</div>
            <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
              <AnimatedNumber value={kpis.total_forecast_units || 0} />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Units across active SKUs</div>
          </div>
          <TrendingUp className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
        </div>

        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Critical stockout risks</div>
            <div className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
              <AnimatedNumber value={kpis.critical_count || 0} suffix=" SKUs" />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Immediate reorder required</div>
          </div>
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        </div>

        <div className="p-5 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Projected 28-day revenue</div>
            <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
              <AnimatedNumber value={kpis.projected_revenue || 0} prefix="$" />
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">LightGBM Tweedie estimate</div>
          </div>
          <DollarSign className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
        </div>

        <div className="p-5 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">AI policy fill rate</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              <AnimatedNumber value={kpis.ai_fill_rate || 98} suffix="%" />
            </div>
            <AnimatedProgressBar
              value={kpis.ai_fill_rate || 98}
              barClassName="bg-emerald-500 dark:bg-emerald-400"
              className="mt-1.5"
            />
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Simulated 28-day service level</div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Row 2: 4 Operational Surface Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { val: kpis.total_inventory_value || 0, prefix: "$", suffix: "", label: "Current stock value", sub: "+41% vs last month", subCls: "text-emerald-600 dark:text-emerald-400", tab: "products", Icon: Layers },
          { val: kpis.total_reorder_cost || 0, prefix: "$", suffix: "", label: "Recommended PO budget", sub: `${kpis.watch_count || 0} watch SKUs`, subCls: "text-amber-600 dark:text-amber-400", tab: "report", Icon: ShoppingCart },
          { val: kpis.cost_savings_vs_eoq || 0, prefix: "$", suffix: "", label: "AI savings vs. EOQ", sub: "+35% lower cost", subCls: "text-emerald-600 dark:text-emerald-400", tab: "policy", Icon: PiggyBank },
          { val: kpis.overstock_count || 0, prefix: "", suffix: " SKUs", label: "Overstock (>60d cover)", sub: "Capital tied up", subCls: "text-zinc-500 dark:text-zinc-400", tab: "manage-stock", Icon: Package },
        ].map((card) => (
          <div key={card.label} className={`${CARD} p-5 flex flex-col gap-3.5`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold tabular-nums text-zinc-950 dark:text-white">
                  <AnimatedNumber value={card.val} prefix={card.prefix} suffix={card.suffix} />
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{card.label}</div>
              </div>
              <card.Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-1" />
            </div>
            <div className="border-t border-[#E5E3DC] dark:border-[#262A34] pt-3 flex items-center justify-between text-xs">
              <span className={`font-medium ${card.subCls}`}>{card.sub}</span>
              <button onClick={() => onNavigate(card.tab)} className="text-zinc-700 dark:text-zinc-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold transition cursor-pointer">
                View all →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: Sales & Forecast Trajectory + Overall Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-8 ${CARD} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Sales & 28-day AI forecast</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Aggregate units across all SKUs (LightGBM Tweedie)</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 bg-[#F7F6F2] dark:bg-[#111318] p-1 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34]">
              {["1D", "1W", "1M", "3M", "6M", "1Y"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition cursor-pointer ${timeframe === tf
                    ? "bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectorySlice}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262A34" : "#E5E3DC"} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Area type="monotone" dataKey="actual" name="Historical Sales" stroke="#64748B" fill={darkMode ? "#334155" : "#CBD5E1"} fillOpacity={0.35} strokeWidth={2} />
                <Area type="monotone" dataKey="forecast" name="AI Forecast (28D)" stroke={darkMode ? "#14B8A6" : "#0F766E"} fill={darkMode ? "#14B8A6" : "#0F766E"} fillOpacity={0.18} strokeWidth={2.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-4 ${CARD} p-5 flex flex-col justify-between space-y-4`}>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white mb-3">Operations overview</h2>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <button onClick={() => onNavigate("suppliers")} className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer">
                <Truck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums"><AnimatedNumber value={erpData?.suppliers?.length || 0} /></div>
                <div className="text-[11px] text-zinc-500">Suppliers</div>
              </button>
              <button onClick={() => onNavigate("products")} className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer">
                <Package className="w-4 h-4 text-zinc-600 dark:text-zinc-300 mx-auto mb-1" />
                <div className="text-sm font-extrabold"><AnimatedNumber value={skus.length} /></div>
                <div className="text-[10px] text-zinc-500">Active SKUs</div>
              </button>
              <button onClick={() => onNavigate("invoice-report")} className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer">
                <ShoppingCart className="w-4 h-4 text-zinc-600 dark:text-zinc-300 mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums"><AnimatedNumber value={erpData?.invoices?.length || 0} /></div>
                <div className="text-[11px] text-zinc-500">Invoices</div>
              </button>
            </div>
          </div>

          <div className="border-t border-[#E5E3DC] dark:border-[#262A34] pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold">SKU Health Mix</h3>
              <span className="text-[11px] text-zinc-500">Current job</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
                <div className="text-base font-bold tabular-nums text-red-500"><AnimatedNumber value={kpis.critical_count || 0} /></div>
                <div className="text-[11px] text-zinc-500">Critical SKUs</div>
              </div>
              <div className="p-3 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
                <div className="text-base font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6]"><AnimatedNumber value={kpis.healthy_count || 0} /></div>
                <div className="text-[11px] text-zinc-500">Healthy SKUs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Top Selling Products + Low Stock Products + Recent Sales (Figma 3-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-4 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Top Selling Products</h3>
            <button onClick={() => onNavigate("products")} className="text-xs font-semibold underline text-zinc-900 dark:text-white cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topMoving.map((s) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 dark:text-white truncate">{s.product_name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400 truncate">{s.sku} • ${s.price}</div>
                </div>
                <span className="px-2 py-0.5 rounded-[5px] bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white font-semibold shrink-0">
                  {s.total_28d_demand} units
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-4 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Low Stock Products</h3>
            <button onClick={() => onNavigate("low-stocks")} className="text-xs font-semibold underline text-zinc-900 dark:text-white cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lowStockList.map((s) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 dark:text-white truncate">{s.product_name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400 truncate">ID: #{s.sku} • Run-out: {s.run_out_date}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold ${s.urgency === "critical" ? "text-red-500" : s.urgency === "watch" ? "text-amber-500" : "text-emerald-500"}`}>
                    {s.days_left}d left
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-slate-400">{s.current_stock} Instock</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-4 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Recent Sales</h3>
            <button onClick={() => onNavigate("sales-report")} className="text-xs font-semibold underline text-zinc-900 dark:text-white cursor-pointer">
              View All
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentSalesSkus.map((s, idx) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 dark:text-white truncate">{s.product_name}</div>
                  <div className="text-zinc-500 dark:text-zinc-400 truncate">{s.category} • ${s.price}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold shrink-0 ${idx % 3 === 1 ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
                  {idx % 3 === 1 ? "Processing" : "Completed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Top SKU Revenue vs Reorder Cost + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-6 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold">Projected Revenue vs. Reorder Cost</h3>
              <p className="text-xs text-zinc-500">Top 6 SKUs (28-day horizon)</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">
              <AnimatedNumber value={kpis.total_reorder_cost || 0} prefix="$" suffix=" PO" />
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topMoving.map((s) => ({
                  sku: s.sku,
                  revenue: Math.round((s.total_28d_demand || 0) * (s.price || 0)),
                  cost: Math.round(s.order_cost || 0),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                <XAxis dataKey="sku" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="revenue" name="Est. Revenue ($)" fill="#0E9384" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Reorder Cost ($)" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-6 ${CARD} p-5 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Recent Invoices</h3>
            <button onClick={() => onNavigate("invoice-report")} className="text-xs font-semibold underline cursor-pointer">
              View All
            </button>
          </div>
          {(erpData?.invoices || []).length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No invoices recorded in the database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-slate-700/70 text-[11px] uppercase text-zinc-500">
                    <th className="py-2 pr-3">Due Date</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(erpData?.invoices || []).slice(0, 5).map((row) => (
                    <tr key={row.inv}>
                      <td className="py-2.5 pr-3 text-zinc-500">{row.due_date}</td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold">{row.customer}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{row.inv}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${row.status === "Paid" ? "bg-emerald-500/15 text-emerald-500" : row.status === "Overdue" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold">${Number(row.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 6: Top Categories & Gemini Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Categories Donut + Category Statistics */}
        <div className={`lg:col-span-12 ${CARD} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold">Top Categories</h3>
              <button onClick={() => onNavigate("categories")} className="text-xs font-semibold underline cursor-pointer">View All</button>
            </div>
            <p className="text-xs text-zinc-500 mb-2">28-day predicted unit volume</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={job.category_breakdown || []} dataKey="demand_units" nameKey="category" innerRadius={40} outerRadius={64} paddingAngle={3}>
                    {(job.category_breakdown || []).map((_, idx) => (
                      <Cell key={idx} fill={piePalette[idx % piePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {(job.category_breakdown || []).map((c, idx) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: piePalette[idx % piePalette.length] }} />
                    <span className="font-medium">{c.category}</span>
                  </div>
                  <span className="font-semibold">{c.demand_units} units</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-slate-700/70 flex justify-between text-xs">
            <span className="text-zinc-500">Categories: <strong><AnimatedNumber value={(job.category_breakdown || []).length} /></strong></span>
            <span className="text-zinc-500">Total Products: <strong><AnimatedNumber value={kpis.total_skus || skus.length} /></strong></span>
          </div>
        </div>
      </div>

      {/* Row 7: Executive Summary */}
      <div className={`${CARD} border-l-4 border-l-[#0F766E] dark:border-l-[#14B8A6] p-5 flex flex-col justify-between`}>
        <div>
          <div className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] mb-2">
            Executive forecast summary
          </div>
          <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
            {job.gemini_executive_summary || "Executive summary generated."}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>Pipeline: LightGBM Tweedie + Gemini 2.5</span>
          <button onClick={() => onNavigate("policy")} className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline cursor-pointer">
            Policy benchmark →
          </button>
        </div>
      </div>
    </div>
  );
}

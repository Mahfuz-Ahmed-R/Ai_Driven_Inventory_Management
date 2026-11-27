import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { Package, AlertTriangle, Building2, SlidersHorizontal, Sparkles, Lock } from "lucide-react";
import { useSaas } from "../context/SaasContext";

export default function DreamsScreensView({ page, job, searchQuery, darkMode, onNavigate }) {
  const { saasState } = useSaas();
  const defaultLeadTime = Number(saasState?.onboarding?.data?.default_lead_time) || 4;
  const [lowStockTab, setLowStockTab] = useState("low");
  const [simLeadTime, setSimLeadTime] = useState(job?.lead_time_days || defaultLeadTime);
  const [simSafetyMult, setSimSafetyMult] = useState(1.65);
  const [authEmail, setAuthEmail] = useState("admin@freshmart.ai");
  const [authStatus, setAuthStatus] = useState("");

  const skus = job?.skus || [];
  const filteredSkus = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return q
      ? skus.filter((s) => s.sku.toLowerCase().includes(q) || s.product_name.toLowerCase().includes(q))
      : skus;
  }, [skus, searchQuery]);

  if (page === "auth") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-[#141417] border border-zinc-200 dark:border-zinc-800 rounded-[12px] p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">Company Workspace Sign In</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">DreamsAI Inventory Portal</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Work Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[8px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              defaultValue="••••••••••"
              className="w-full px-3 py-2 text-sm rounded-[8px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white"
            />
          </div>
          <button
            onClick={() => setAuthStatus("Signed in as " + authEmail)}
            className="w-full py-2.5 rounded-[8px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-[#0F766E] hover:text-white dark:hover:bg-[#0F766E] dark:hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Sign In to Workspace
          </button>
          {authStatus && (
            <div className="text-xs text-center font-semibold text-emerald-500">{authStatus}</div>
          )}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Upload a CSV to populate this screen.
        </p>
        <button
          onClick={() => onNavigate("upload")}
          className="px-4 py-2 rounded-[8px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
        >
          Upload CSV
        </button>
      </div>
    );
  }

  if (page === "sales-dashboard" || page === "sales-report") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
            {page === "sales-dashboard" ? "Sales & Demand Analytics Dashboard" : "28-Day Forecast Report"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Predicted unit velocity and revenue trajectory across {skus.length} SKUs
          </p>
        </div>
        <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-4">Top 10 SKUs — 28-Day Predicted Demand</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...skus].sort((a, b) => b.total_28d_demand - a.total_28d_demand).slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="total_28d_demand" name="28D Forecast (Units)" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (page === "products") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Products Catalog</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Dashboard &gt; Inventory &gt; Products</p>
          </div>
          <span className="text-xs font-semibold text-zinc-500">{filteredSkus.length} Products</span>
        </div>
        <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase text-zinc-500">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">28D Demand</th>
                <th className="py-3 px-4">Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredSkus.map((s) => (
                <tr key={s.sku} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                  <td className="py-3 px-4 font-bold text-zinc-950 dark:text-white">{s.sku}</td>
                  <td className="py-3 px-4 flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
                    <Package className="w-3.5 h-3.5 text-zinc-400" /> {s.product_name}
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{s.category}</td>
                  <td className="py-3 px-4 text-right">${s.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-semibold">{s.current_stock}</td>
                  <td className="py-3 px-4 text-right font-bold">{s.total_28d_demand}</td>
                  <td className="py-3 px-4 text-zinc-500">{s.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (page === "low-stocks") {
    const lowList = filteredSkus.filter((s) => (lowStockTab === "out" ? s.days_left <= 7 : s.urgency === "critical" || s.urgency === "watch"));
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Low Stocks & Stockout Alerts</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Dashboard &gt; Inventory &gt; Low Stocks</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "low", label: "Low Stocks" },
            { id: "out", label: "Imminent Stockout (≤7d)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setLowStockTab(t.id)}
              className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition cursor-pointer ${
                lowStockTab === t.id
                  ? "bg-red-500 text-white"
                  : "bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-300 hover:border-[#0F766E] hover:text-[#0F766E]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase text-zinc-500">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Days Left</th>
                <th className="py-3 px-4">Run-Out Date</th>
                <th className="py-3 px-4 text-right">Reorder Qty</th>
                <th className="py-3 px-4">Reorder By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lowList.map((s) => (
                <tr key={s.sku}>
                  <td className="py-3 px-4 font-bold">{s.sku}</td>
                  <td className="py-3 px-4 font-medium flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${s.urgency === "critical" ? "text-red-500" : "text-amber-500"}`} />{" "}
                    {s.product_name}
                  </td>
                  <td className="py-3 px-4 text-right">{s.current_stock}</td>
                  <td className={`py-3 px-4 text-right font-bold ${s.days_left <= 7 ? "text-red-500" : "text-amber-500"}`}>
                    {s.days_left}d
                  </td>
                  <td className="py-3 px-4">{s.run_out_date}</td>
                  <td className="py-3 px-4 text-right font-bold">{s.suggested_order_qty} units</td>
                  <td className={`py-3 px-4 font-semibold ${s.reorder_by === "IMMEDIATE" ? "text-red-500" : "text-emerald-500"}`}>
                    {s.reorder_by}
                  </td>
                </tr>
              ))}
              {lowList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500">
                    No SKUs match this alert filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (page === "categories") {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Category Breakdown</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(job.category_breakdown || []).map((c) => (
            <div key={c.category} className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
              <div className="text-sm font-bold text-zinc-950 dark:text-white">{c.category}</div>
              <div className="text-2xl font-extrabold text-zinc-950 dark:text-white">{c.demand_units} units</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {c.sku_count} SKUs • Projected Revenue: ${c.revenue.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "manage-stock" || page === "stock-adjustment") {
    const sampleSku = skus[0];
    const adjustedOrder = sampleSku
      ? Math.max(0, Math.ceil(sampleSku.avg_daily_velocity * (simLeadTime + 14) + simSafetyMult * 3 * Math.sqrt(simLeadTime) - sampleSku.current_stock))
      : 0;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
            {page === "manage-stock" ? "Manage Stock (Digital Twin)" : "Stock Adjustment & What-If Simulator"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Simulate supplier lead time and safety buffer adjustments against 28-day predicted demand
          </p>
        </div>

        <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Lead Time: {simLeadTime} days</label>
            <input type="range" min={1} max={14} value={simLeadTime} onChange={(e) => setSimLeadTime(Number(e.target.value))} className="w-full accent-zinc-950 dark:accent-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Service Z-Factor: {simSafetyMult}</label>
            <input type="range" min={1.0} max={2.5} step={0.05} value={simSafetyMult} onChange={(e) => setSimSafetyMult(Number(e.target.value))} className="w-full accent-zinc-950 dark:accent-white" />
          </div>
          <div className="p-3 rounded-[8px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 font-bold"><SlidersHorizontal className="w-3.5 h-3.5" /> Simulated Top SKU Order</div>
            <div className="text-lg font-extrabold mt-1">{adjustedOrder} units</div>
          </div>
        </div>

        {sampleSku && (
          <div className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-3">
              Digital Twin Sawtooth — {sampleSku.product_name} ({sampleSku.sku})
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sampleSku.sawtooth_payload || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={18} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Area type="monotone" dataKey="on_hand" name="On-Hand Units" stroke="#0E9384" fill="#0E9384" fillOpacity={0.22} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Warehouses / Stores
  const stores = Array.from(new Set(skus.map((s) => s.store_id)));
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Stores & Warehouses</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stores.map((st) => {
          const stSkus = skus.filter((s) => s.store_id === st);
          const totalStock = stSkus.reduce((acc, s) => acc + s.current_stock, 0);
          return (
            <div key={st} className="bg-white dark:bg-[#141417] rounded-[8px] border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-950 dark:text-white">
                <Building2 className="w-4 h-4" /> {st}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {stSkus.length} Active SKUs • {totalStock.toLocaleString()} Total Units On-Hand
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

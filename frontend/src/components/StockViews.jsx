import { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { SlidersHorizontal, Boxes, Plus } from "lucide-react";
import { erpRequest } from "../hooks/useErpData";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { useSaas } from "../context/SaasContext";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";
const TH = "py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400";
const INPUT = "px-3 py-2 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]";

export default function StockViews({ page, job, erpData, refreshErpData, searchQuery, darkMode }) {
  const { saasState } = useSaas();
  const defaultLeadTime = Number(saasState?.onboarding?.data?.default_lead_time) || 4;
  const skus = useMemo(() => (job?.skus?.length ? job.skus : erpData?.products || []), [job, erpData?.products]);
  const warehouses = erpData?.warehouses || [];
  const stores = erpData?.stores || [];
  const adjustments = erpData?.adjustments || [];

  const [simLeadTime, setSimLeadTime] = useState(job?.lead_time_days || defaultLeadTime);
  const [simSafetyMult, setSimSafetyMult] = useState(1.65);
  const [warehouseFilter, setWarehouseFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");

  const gridStroke = darkMode ? "#27272A" : "#E4E4E7";
  const q = (searchQuery || "").toLowerCase();
  const filteredSkus = useMemo(() => {
    return skus.filter((s) => {
      if (warehouseFilter !== "All" && (s.warehouse || "Lavish Warehouse") !== warehouseFilter) return false;
      if (storeFilter !== "All" && (s.store_id || "Electro Mart") !== storeFilter) return false;
      if (q && !s.sku.toLowerCase().includes(q) && !s.product_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [skus, warehouseFilter, storeFilter, q]);

  const sampleSku = skus[0];
  const adjustedOrder = sampleSku
    ? Math.max(0, Math.ceil((sampleSku.avg_daily_velocity || 2.5) * (simLeadTime + 14) + simSafetyMult * 3 * Math.sqrt(simLeadTime) - sampleSku.current_stock))
    : 0;

  if (skus.length === 0 && adjustments.length === 0) {
    return (
      <div className={`${CARD} p-8 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
        No stock data yet. Upload a CSV to view stock levels and Digital Twin simulations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
          {page === "manage-stock" ? "Manage Stock (Digital Twin)" : "Stock Adjustment & What-If Simulator"}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {page === "manage-stock"
            ? "Manage warehouse stock levels and inspect Digital Twin sawtooth trajectories"
            : "Simulate supplier lead time, safety buffer adjustments, and manual stock corrections"}
        </p>
      </div>

      <div className={`${CARD} p-5 grid grid-cols-1 md:grid-cols-3 gap-5 items-center`}>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1">Lead Time: {simLeadTime} days</label>
          <input type="range" min={1} max={14} value={simLeadTime} onChange={(e) => setSimLeadTime(Number(e.target.value))} className="w-full accent-[#0F766E]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1">Service Z-Factor: {simSafetyMult}</label>
          <input type="range" min={1.0} max={2.5} step={0.05} value={simSafetyMult} onChange={(e) => setSimSafetyMult(Number(e.target.value))} className="w-full accent-[#0F766E]" />
        </div>
        <div className="p-3 rounded-[8px] bg-zinc-100 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-1.5 font-bold"><SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" /> Simulated Top SKU Order</div>
          <div className="text-lg font-extrabold mt-1 text-[#0E9384]"><AnimatedNumber value={adjustedOrder} suffix=" units" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {sampleSku?.sawtooth_payload?.length > 0 && (
          <div className={`lg:col-span-7 ${CARD} p-5`}>
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-3">
              Digital Twin Sawtooth — {sampleSku.product_name} ({sampleSku.sku})
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sampleSku.sawtooth_payload}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717A" }} minTickGap={18} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Area type="monotone" dataKey="on_hand" name="On-Hand Units" stroke="#0E9384" fill="#0E9384" fillOpacity={0.22} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className={`${sampleSku?.sawtooth_payload?.length > 0 ? "lg:col-span-5" : "lg:col-span-12"} ${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-3">Warehouse Stock Distribution</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouses.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="stock" name="Units On-Hand" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={`${CARD} p-4 flex flex-wrap gap-3 items-center justify-between`}>
        <div className="flex flex-wrap gap-3">
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className={INPUT}>
            <option value="All">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id}>{w.name}</option>)}
          </select>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className={INPUT}>
            <option value="All">All Stores</option>
            {stores.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
        {page === "stock-adjustment" && (
          <button
            onClick={async () => {
              const s = filteredSkus[0];
              if (!s) return;
              await erpRequest("/api/erp/adjustments/", "POST", {
                warehouse: s.warehouse || "Lavish Warehouse",
                store: s.store_id || "Electro Mart",
                product: s.product_name,
                sku: s.sku,
                person: "Admin",
                qty: 10,
                type: "Addition (+)",
              });
              await refreshErpData?.();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Adjustment
          </button>
        )}
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr>
              <th className={TH}>Warehouse</th>
              <th className={TH}>Store</th>
              <th className={TH}>Product Name</th>
              <th className={TH}>Date</th>
              <th className={TH}>Person</th>
              <th className={`${TH} text-right`}>Qty</th>
              {page === "stock-adjustment" && <th className={TH}>Adjustment Type</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(page === "stock-adjustment" ? adjustments : filteredSkus.map((s, idx) => ({
              id: s.sku,
              warehouse: s.warehouse || (warehouses[idx % Math.max(1, warehouses.length)]?.name || "Lavish Warehouse"),
              store: s.store_id || (stores[idx % Math.max(1, stores.length)]?.name || "Electro Mart"),
              product: s.product_name,
              date: "24 Dec 2024",
              person: warehouses[idx % Math.max(1, warehouses.length)]?.contact || "Manager",
              qty: s.current_stock,
            }))).map((row) => (
              <tr key={row.id}>
                <td className="py-3 px-4 font-medium">{row.warehouse}</td>
                <td className="py-3 px-4 text-zinc-500">{row.store}</td>
                <td className="py-3 px-4 font-bold flex items-center gap-2"><Boxes className="w-3.5 h-3.5 text-[#0E9384]" /> {row.product}</td>
                <td className="py-3 px-4 text-zinc-500">{row.date}</td>
                <td className="py-3 px-4 text-zinc-500">{row.person}</td>
                <td className="py-3 px-4 text-right font-bold">{row.qty}</td>
                {page === "stock-adjustment" && (
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${row.type?.includes("+") ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                      {row.type}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

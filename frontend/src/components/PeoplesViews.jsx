import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { Truck, Plus } from "lucide-react";
import { erpRequest } from "../hooks/useErpData";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";
const TH = "py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400";

function countBy(arr, key) {
  return Object.entries(arr.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {})).map(([name, count]) => ({ name, count }));
}

export default function PeoplesViews({ erpData, refreshErpData, searchQuery, darkMode }) {
  const suppliers = erpData?.suppliers || [];
  const [newName, setNewName] = useState("");

  const gridStroke = darkMode ? "#27272A" : "#E4E4E7";
  const q = (searchQuery || "").toLowerCase();
  const list = q ? suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) : suppliers;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-2"><Truck className="w-5 h-5 text-[#0F766E]" /> Suppliers</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your suppliers ({list.length})</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Supplier name..." className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-[8px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700" />
          <button
            onClick={async () => {
              if (!newName.trim()) return;
              await erpRequest("/api/erp/suppliers/", "POST", { name: newName });
              setNewName("");
              await refreshErpData?.();
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </div>
      </div>
      {list.length === 0 ? (
        <div className={`${CARD} p-8 text-center text-xs text-zinc-500 dark:text-zinc-400`}>
          No suppliers added yet. Use the form above to add your first supplier.
        </div>
      ) : (
        <>
          <div className={`${CARD} p-5`}>
            <h2 className="text-sm font-bold mb-3">Suppliers by Region</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countBy(list, "country")}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717A" }} allowDecimals={false} />
                  <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                  <Bar dataKey="count" name="Suppliers" fill="#0E9384" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr><th className={TH}>Code</th><th className={TH}>Supplier</th><th className={TH}>Email</th><th className={TH}>Phone</th><th className={TH}>Country</th><th className={TH}>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.map((s) => (
                  <tr key={s.code}>
                    <td className="py-3 px-4 font-bold">{s.code}</td>
                    <td className="py-3 px-4 font-semibold">{s.name}</td>
                    <td className="py-3 px-4 text-zinc-500">{s.email}</td>
                    <td className="py-3 px-4 text-zinc-500">{s.phone}</td>
                    <td className="py-3 px-4">{s.country}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-[5px] text-[10px] font-bold bg-emerald-500/15 text-emerald-500">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

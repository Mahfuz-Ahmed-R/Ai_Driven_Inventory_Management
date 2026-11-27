import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { AnimatedNumber, AnimatedProgressBar } from "./ui/AnimatedNumber";

export default function PolicyBenchmarkView({ job, darkMode }) {
  const policies = job?.policies || [];

  if (!job || policies.length === 0) {
    return (
      <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] p-8 text-center text-sm text-zinc-500">
        Run an analysis first to view the EOQ vs Safety-Stock vs ML/AI Policy Benchmark.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Purchase & decision policies benchmark</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          EOQ Rule vs. Static Safety-Stock vs. Dynamic ML/AI Policy under identical 28-day demand and lead-time conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {policies.map((p) => {
          const isMl = p.policy_key === "ml";
          return (
            <div
              key={p.policy_key}
              className={`rounded-[8px] p-5 border bg-white dark:bg-[#181B22] ${
                isMl
                  ? "border-[#0F766E] dark:border-[#14B8A6]"
                  : "border-[#E5E3DC] dark:border-[#262A34]"
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-sm font-semibold text-zinc-950 dark:text-white">{p.policy_name}</span>
                {isMl && (
                  <span className="text-[11px] font-semibold text-[#0F766E] dark:text-[#14B8A6]">
                    Recommended
                  </span>
                )}
              </div>
              <div className="space-y-2.5 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Total supply cost</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100"><AnimatedNumber value={p.total_cost} prefix="$" /></span>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Service level (fill rate)</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400"><AnimatedNumber value={p.fill_rate} decimals={1} suffix="%" /></span>
                  </div>
                  <AnimatedProgressBar
                    value={p.fill_rate}
                    barClassName={isMl ? "bg-[#0F766E] dark:bg-[#14B8A6]" : "bg-emerald-500"}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Stockout units</span>
                  <span className={`font-semibold ${p.stockout_units > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    <AnimatedNumber value={p.stockout_units} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Avg shelf inventory</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100"><AnimatedNumber value={p.avg_inventory} suffix=" units" /></span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-[#E5E3DC] dark:border-[#262A34]">
                  <span className="text-zinc-500 dark:text-zinc-400">Net profit</span>
                  <span className="font-bold text-[#0F766E] dark:text-[#14B8A6]"><AnimatedNumber value={p.net_profit} prefix="$" /></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] p-5">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white mb-4">Total cost vs. net profit ($)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={policies}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262A34" : "#E5E3DC"} />
              <XAxis dataKey="policy_name" tick={{ fontSize: 11, fill: "#71717A" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
              <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
              <Legend />
              <Bar dataKey="total_cost" name="Total Cost ($)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net_profit" name="Net Profit ($)" fill={darkMode ? "#14B8A6" : "#0F766E"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

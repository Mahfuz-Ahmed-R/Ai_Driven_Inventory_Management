import { useCallback, useEffect, useState } from "react";
import { Gift, Copy, Check, MousePointerClick, Users, DollarSign, Sparkles } from "lucide-react";
import { apiRequest } from "../utils/apiClient";
import { useToast } from "./ui/ToastProvider";
import DataTable from "./ui/DataTable";
import { useSaas } from "../context/SaasContext";
import { AnimatedNumber } from "./ui/AnimatedNumber";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";

export default function ReferralView() {
  const [data, setData] = useState({ summary: {}, events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { refreshSaas } = useSaas();
  const toast = useToast();

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("/api/saas/referrals/");
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load referral stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const code = data.summary?.code || "DREAMS-AI-2026";
  const shareUrl = `${window.location.origin}/#/?ref=${encodeURIComponent(code)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(shareUrl);
    }
  };

  const handleMarkRewarded = async (ev) => {
    try {
      await apiRequest("/api/saas/referrals/track/", {
        method: "POST",
        body: { action: "convert", event_id: ev.id },
      });
      toast.success(`Rewarded $${ev.reward_amount} for ${ev.referred_company}`);
      await Promise.all([loadReferrals(), refreshSaas()]);
    } catch (err) {
      toast.error(err.message || "Failed to convert referral");
    }
  };

  const columns = [
    { key: "referred_company", label: "Company", sortable: true, render: (r) => <span className="font-bold">{r.referred_company}</span> },
    { key: "referred_email", label: "Email", sortable: true },
    { key: "plan_tier", label: "Plan", sortable: true, render: (r) => <span className="uppercase font-bold text-[10px]">{r.plan_tier}</span> },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold capitalize ${
            r.status === "rewarded"
              ? "bg-emerald-500/15 text-emerald-500"
              : r.status === "active"
              ? "bg-blue-500/15 text-blue-500"
              : "bg-amber-500/15 text-amber-500"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "reward_amount", label: "Reward", sortable: true, align: "right", render: (r) => <span className="font-bold">${Number(r.reward_amount).toFixed(2)}</span> },
    { key: "created_at", label: "Date", sortable: true },
    {
      key: "actions",
      label: "Action",
      noExport: true,
      render: (r) =>
        r.status !== "rewarded" ? (
          <button
            type="button"
            onClick={() => handleMarkRewarded(r)}
            className="px-2.5 py-1 rounded-[6px] bg-[#0E9384] text-white text-[11px] font-bold hover:opacity-90 cursor-pointer"
          >
            Approve Reward
          </button>
        ) : (
          <span className="text-[11px] text-zinc-400">Paid</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#0F766E]" /> Referral & Affiliate Program
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Earn 20% recurring credit ($40 per Pro conversion) when retail partners join with your link.
          </p>
        </div>
      </div>

      {/* Share Link Card */}
      <div className={`${CARD} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="space-y-1">
          <div className="text-xs font-bold text-zinc-950 dark:text-white">Your Unique Referral Link</div>
          <div className="text-[11px] text-zinc-500 dark:text-slate-400">
            Code: <span className="font-mono font-bold text-[#0E9384]">{code}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 max-w-lg w-full">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 min-w-0 px-3 py-2 text-xs font-mono rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:bg-[#0F766E] hover:text-zinc-950 transition cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Link Clicks", val: data.summary?.clicks ?? 0, prefix: "", decimals: 0, icon: MousePointerClick, color: "text-blue-500 bg-blue-500/15" },
          { label: "Total Signups", val: data.summary?.total_signups ?? 0, prefix: "", decimals: 0, icon: Users, color: "text-[#0E9384] bg-[#0E9384]/15" },
          { label: "Conversions", val: data.summary?.converted ?? 0, prefix: "", decimals: 0, icon: Sparkles, color: "text-amber-500 bg-amber-500/15" },
          { label: "Earned Credits", val: Number(data.summary?.total_earned ?? 0), prefix: "$", decimals: 2, icon: DollarSign, color: "text-emerald-500 bg-emerald-500/15" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`${CARD} p-4 flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-slate-400">{k.label}</div>
                <div className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">
                  <AnimatedNumber value={k.val} prefix={k.prefix} decimals={k.decimals} />
                </div>
              </div>
              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <DataTable
        data={data.events || []}
        columns={columns}
        persistKey="referrals"
        loading={loading}
        error={error}
        onRetry={loadReferrals}
        searchPlaceholder="Search referred company or email..."
        filters={[
          { key: "status", label: "Status", options: ["pending", "active", "rewarded"] },
          { key: "plan_tier", label: "Plan", options: ["free", "basic", "pro", "enterprise"] },
        ]}
        dateRangeConfig={{ key: "created_at", label: "Date" }}
        exportFilename="referrals_report.csv"
      />
    </div>
  );
}

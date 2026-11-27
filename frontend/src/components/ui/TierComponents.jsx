import { Crown, Lock, Sparkles, Check, X } from "lucide-react";
import { useSaas } from "../../context/SaasContext";
import { useToast } from "./ToastProvider";

const TIER_STYLES = {
  free: "bg-zinc-200/80 dark:bg-slate-700 text-zinc-700 dark:text-slate-200",
  basic: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
  pro: "bg-[#0F766E]/20 text-zinc-900 dark:text-[#0F766E] border border-[#0F766E]/40",
  enterprise: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
};

export function TierBadge({ tier, size = "sm" }) {
  const key = (tier || "free").toLowerCase();
  const cls = TIER_STYLES[key] || TIER_STYLES.free;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${cls} ${
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]"
      }`}
    >
      {key !== "free" && <Crown className="w-2.5 h-2.5" />}
      {key}
    </span>
  );
}

export function UsageQuotaWidget({ compact = false }) {
  const { saasState, openUpgradeModal } = useSaas();
  const { plan_tier, usage } = saasState;
  const prodPct = Math.min(100, Math.round(((usage?.products_count || 0) / Math.max(1, usage?.products_limit || 50)) * 100));
  const jobPct = Math.min(100, Math.round(((usage?.jobs_count || 0) / Math.max(1, usage?.jobs_limit || 5)) * 100));

  return (
    <div className="rounded-[8px] bg-zinc-100 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Plan & Quotas</span>
        <TierBadge tier={plan_tier} size="xs" />
      </div>

      <div className="space-y-1.5 text-[10px]">
        <div>
          <div className="flex justify-between text-zinc-500 dark:text-slate-400 mb-0.5">
            <span>Products</span>
            <span className="font-semibold text-zinc-800 dark:text-slate-200">
              {usage?.products_count || 0} / {usage?.products_limit > 50000 ? "∞" : usage?.products_limit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${prodPct > 85 ? "bg-red-500" : "bg-[#0E9384]"}`}
              style={{ width: `${prodPct}%` }}
            />
          </div>
        </div>

        {!compact && (
          <div>
            <div className="flex justify-between text-zinc-500 dark:text-slate-400 mb-0.5">
              <span>Forecast Jobs</span>
              <span className="font-semibold text-zinc-800 dark:text-slate-200">
                {usage?.jobs_count || 0} / {usage?.jobs_limit > 50000 ? "∞" : usage?.jobs_limit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${jobPct > 85 ? "bg-amber-500" : "bg-[#0F766E]"}`}
                style={{ width: `${jobPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {plan_tier !== "enterprise" && (
        <button
          type="button"
          onClick={() => openUpgradeModal("Unlock higher SKU quotas, PDF exports, and Policy Benchmark.")}
          className="w-full py-1.5 rounded-[6px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold hover:bg-[#0F766E] hover:text-zinc-950 transition cursor-pointer"
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
}

export function FeatureLock({ featureKey, requiredTier = "Pro", title, description, children }) {
  const { hasFeature, openUpgradeModal } = useSaas();
  if (hasFeature(featureKey)) return children;

  return (
    <div className="relative rounded-[10px] border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#1E222D] p-6 sm:p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center">
        <Lock className="w-6 h-6" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-bold uppercase">
        Requires {requiredTier} Plan
      </div>
      <h3 className="text-base font-bold text-zinc-950 dark:text-white">{title || "Premium Feature Locked"}</h3>
      <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-md mx-auto">
        {description || `Upgrade to the ${requiredTier} tier to unlock this capability across your workspace.`}
      </p>
      <button
        type="button"
        onClick={() => openUpgradeModal(title || `Upgrade to ${requiredTier} to unlock this feature.`)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#0F766E] text-zinc-950 text-xs font-bold hover:opacity-90 transition cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5" /> View Plans & Upgrade
      </button>
    </div>
  );
}

export function UpgradeModal() {
  const { saasState, upgradeModalOpen, setUpgradeModalOpen, upgradeReason, upgradePlan } = useSaas();
  const toast = useToast();

  if (!upgradeModalOpen) return null;

  const tiers = [
    { key: "free", name: "Free", price: "$0", desc: "Starter sandbox", features: ["50 SKUs", "5 Forecast Jobs", "CSV Export"] },
    { key: "basic", name: "Basic", price: "$29/mo", desc: "Growing stores", features: ["250 SKUs", "25 Forecast Jobs", "PDF Executive Reports"] },
    { key: "pro", name: "Pro", price: "$79/mo", desc: "AI-driven teams", features: ["2,000 SKUs", "150 Forecast Jobs", "Policy Benchmark", "AI Copilot"] },
    { key: "enterprise", name: "Enterprise", price: "$199/mo", desc: "Unlimited scale", features: ["Unlimited SKUs", "Unlimited Jobs", "Priority Compute", "Dedicated SLA"] },
  ];

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 rounded-[12px] max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#0F766E]" /> Choose Your Subscription Plan
            </h2>
            <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">
              {upgradeReason || "Scale your LightGBM forecasting quotas and Digital Twin capabilities."}
            </p>
          </div>
          <button
            onClick={() => setUpgradeModalOpen(false)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiers.map((t) => {
            const current = saasState.plan_tier === t.key;
            return (
              <div
                key={t.key}
                className={`rounded-[10px] p-4 border flex flex-col justify-between space-y-4 ${
                  current
                    ? "border-[#0F766E] bg-[#0F766E]/5"
                    : "border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-[#161922]"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-950 dark:text-white">{t.name}</span>
                    {current && <span className="text-[10px] font-bold text-[#0E9384]">Current</span>}
                  </div>
                  <div className="text-xl font-extrabold text-zinc-950 dark:text-white">{t.price}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-slate-400">{t.desc}</div>
                  <ul className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-slate-700/70">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-slate-300">
                        <Check className="w-3 h-3 text-[#0E9384] shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={current}
                  onClick={async () => {
                    try {
                      await upgradePlan(t.key);
                      toast.success(`Switched workspace to ${t.name} plan.`);
                      setUpgradeModalOpen(false);
                    } catch (err) {
                      toast.error(err.message || "Failed to update plan");
                    }
                  }}
                  className={`w-full py-2 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                    current
                      ? "bg-zinc-200 dark:bg-slate-800 text-zinc-500 cursor-default"
                      : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-[#0F766E] hover:text-zinc-950"
                  }`}
                >
                  {current ? "Active Plan" : `Select ${t.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

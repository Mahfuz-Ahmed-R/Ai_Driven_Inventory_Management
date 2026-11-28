import { useState, useEffect } from "react";
import { Settings, Building2, Clock, Target, Shield, CheckCircle2 } from "lucide-react";
import { useSaas } from "../context/SaasContext";
import { useToast } from "./ui/ToastProvider";
import { apiRequest } from "../utils/apiClient";
import { TierBadge } from "./ui/TierComponents";

const CARD = "bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34]";
const INPUT = "w-full px-3 py-2 text-xs rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E] dark:focus:border-[#14B8A6]";

export default function SettingsView({ user }) {
  const { saasState, refreshSaas, openUpgradeModal, setOnboardingOpen } = useSaas();
  const toast = useToast();
  const obData = saasState?.onboarding?.data || {};

  const [companyName, setCompanyName] = useState(obData.company_name || "");
  const [industry, setIndustry] = useState(obData.industry || "Retail & E-Commerce");
  const [leadTime, setLeadTime] = useState(Number(obData.default_lead_time) || 4);
  const [primaryGoal, setPrimaryGoal] = useState(obData.primary_goal || "Reduce Stockouts");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(obData.company_name || "");
    setIndustry(obData.industry || "Retail & E-Commerce");
    setLeadTime(Number(obData.default_lead_time) || 4);
    setPrimaryGoal(obData.primary_goal || "Reduce Stockouts");
  }, [obData.company_name, obData.industry, obData.default_lead_time, obData.primary_goal]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/api/saas/onboarding/", {
        method: "PATCH",
        body: {
          step: 3,
          completed: true,
          data: {
            ...obData,
            company_name: companyName.trim() || "Partner Retail Corp",
            industry,
            default_lead_time: Math.max(1, Math.min(30, Number(leadTime) || 4)),
            primary_goal: primaryGoal,
          },
        },
      });
      await refreshSaas();
      toast.success("Workspace settings saved.");
    } catch (err) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Workspace Settings</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Configure company defaults, supplier lead time, forecasting goals, and subscription plan
        </p>
      </div>

      <form onSubmit={handleSave} className={`${CARD} p-6 space-y-5`}>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white border-b border-[#E5E3DC] dark:border-[#262A34] pb-3">
          <Settings className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" /> Company &amp; Replenishment Defaults
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              <Building2 className="w-3.5 h-3.5 inline mr-1" /> Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Freshmart Retail Corp"
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={INPUT}>
              <option value="Retail & E-Commerce">Retail &amp; E-Commerce</option>
              <option value="Grocery & FMCG">Grocery &amp; FMCG</option>
              <option value="Apparel & Fashion">Apparel &amp; Fashion</option>
              <option value="Electronics & Hardware">Electronics &amp; Hardware</option>
              <option value="Wholesale & Distribution">Wholesale &amp; Distribution</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1" /> Default Supplier Lead Time (Days)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={leadTime}
              onChange={(e) => setLeadTime(e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
              <Target className="w-3.5 h-3.5 inline mr-1" /> Primary Optimization Goal
            </label>
            <select value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} className={INPUT}>
              <option value="Reduce Stockouts">Reduce Stockouts</option>
              <option value="Lower Holding Costs">Lower Holding Costs</option>
              <option value="Automate Purchase Orders">Automate Purchase Orders</option>
              <option value="Compare ML vs Heuristic Policies">Compare ML vs Heuristic Policies</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer"
          >
            Re-run Onboarding Wizard
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Account & Subscription Card */}
      <div className={`${CARD} p-6 flex flex-wrap items-center justify-between gap-4`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white">
            <Shield className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" /> Account &amp; Plan
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Signed in as <strong>{user?.email || user?.username}</strong>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <TierBadge tier={saasState?.plan_tier} />
            <span className="text-xs text-zinc-500">
              {saasState?.usage?.jobs_used || 0} / {saasState?.limits?.max_jobs || 5} forecast jobs used
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openUpgradeModal("Manage or upgrade your subscription tier.")}
          className="px-4 py-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] hover:border-[#0F766E] text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer"
        >
          Manage Subscription
        </button>
      </div>
    </div>
  );
}

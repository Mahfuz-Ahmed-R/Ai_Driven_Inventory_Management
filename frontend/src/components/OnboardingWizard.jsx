import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { useSaas } from "../context/SaasContext";
import { FormField } from "./ui/FormField";
import { validateForm, validators } from "../utils/validation";
import { apiRequest } from "../utils/apiClient";
import { useToast } from "./ui/ToastProvider";

const STEPS = [
  { title: "Workspace", desc: "Company & industry" },
  { title: "Scale", desc: "SKU volume & team" },
  { title: "Forecasting", desc: "Lead time & goals" },
  { title: "Launch", desc: "Review & start" },
];

const DEFAULT_FORM = {
  company_name: "",
  industry: "Retail & Grocery",
  sku_scale: "50-500 SKUs",
  team_size: "2-10",
  default_lead_time: 4,
  primary_goal: "Reduce Stockouts",
};

function getSavedState(onboarding) {
  const savedData = onboarding?.data && Object.keys(onboarding.data).length > 0 ? onboarding.data : {};
  const isCompleted = Boolean(onboarding?.completed);
  return {
    step: isCompleted ? 0 : typeof onboarding?.step === "number" ? Math.min(3, Math.max(0, onboarding.step)) : 0,
    form: { ...DEFAULT_FORM, ...savedData },
  };
}

export default function OnboardingWizard() {
  const { saasState, onboardingOpen, setOnboardingOpen, refreshSaas } = useSaas();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.removeItem("dreams_onboarding_draft");
  }, []);

  useEffect(() => {
    if (onboardingOpen) {
      const saved = getSavedState(saasState?.onboarding);
      setStep(saved.step);
      setForm(saved.form);
      setTouched({});
    }
  }, [onboardingOpen, saasState?.onboarding]);

  if (!onboardingOpen) return null;

  const step0Validation = validateForm(form, {
    company_name: [validators.required("Company name"), validators.minLength(2, "Company name")],
  });

  const handleClose = () => {
    const saved = getSavedState(saasState?.onboarding);
    setStep(saved.step);
    setForm(saved.form);
    setTouched({});
    setOnboardingOpen(false);
  };

  const handleNext = () => {
    if (step === 0 && !step0Validation.isValid) {
      setTouched((t) => ({ ...t, company_name: true }));
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handleComplete = async () => {
    if (!step0Validation.isValid) {
      setStep(0);
      setTouched((t) => ({ ...t, company_name: true }));
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/api/saas/onboarding/", {
        method: "PATCH",
        body: { step: 3, data: form, completed: true },
      });
      await refreshSaas();
      toast.success("Workspace setup saved & personalized!");
      setOnboardingOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const isEditingExisting = Boolean(saasState?.onboarding?.completed);

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 rounded-[12px] max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 animate-modal-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0E9384]">
              <Sparkles className="w-3.5 h-3.5" /> Workspace Setup
            </div>
            <h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">
              Personalize Your Inventory Twin
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Discard changes and close"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-semibold text-zinc-500 dark:text-slate-400">
            <span>Step {step + 1} of {STEPS.length}: {STEPS[step].title}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-[#0F766E] transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Step Content */}
        {step === 0 && (
          <div className="space-y-4">
            <FormField
              label="Company / Store Name"
              htmlFor="ob-company"
              required
              touched={touched.company_name}
              error={step0Validation.errors.company_name}
              valid={!step0Validation.errors.company_name && Boolean(form.company_name)}
            >
              <input
                id="ob-company"
                type="text"
                value={form.company_name}
                onBlur={() => setTouched((t) => ({ ...t, company_name: true }))}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="e.g. Freshmart Retail Corp"
                className="w-full px-3.5 py-2 text-sm rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-slate-300 mb-1">
                Industry Vertical
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white"
              >
                <option>Retail & Grocery</option>
                <option>E-Commerce & D2C</option>
                <option>Wholesale & Distribution</option>
                <option>Electronics & Hardware</option>
                <option>Pharmacy & Healthcare</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-slate-300 mb-1.5">
                Active SKU Count
              </label>
              <div className="space-y-1.5">
                {["< 50 SKUs", "50-500 SKUs", "500-5,000 SKUs", "5,000+ SKUs"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, sku_scale: opt }))}
                    className={`w-full px-3 py-2 rounded-[8px] border text-left text-xs font-semibold cursor-pointer ${
                      form.sku_scale === opt
                        ? "border-[#0F766E] bg-[#0F766E]/10 text-zinc-950 dark:text-white"
                        : "border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-slate-300 mb-1.5">
                Operations Team Size
              </label>
              <div className="space-y-1.5">
                {["Just me", "2-10", "11-50", "50+"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, team_size: opt }))}
                    className={`w-full px-3 py-2 rounded-[8px] border text-left text-xs font-semibold cursor-pointer ${
                      form.team_size === opt
                        ? "border-[#0E9384] bg-[#0E9384]/10 text-zinc-950 dark:text-white"
                        : "border-zinc-200 dark:border-slate-700 text-zinc-600 dark:text-slate-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-slate-300 mb-1">
                Primary Forecasting Goal
              </label>
              <select
                value={form.primary_goal}
                onChange={(e) => setForm((f) => ({ ...f, primary_goal: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white"
              >
                <option>Reduce Stockouts</option>
                <option>Lower Holding Costs</option>
                <option>Automate Purchase Orders</option>
                <option>Compare ML vs Heuristic Policies</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-slate-300 mb-1">
                Default Supplier Lead Time: <strong className="text-[#0E9384]">{form.default_lead_time} days</strong>
              </label>
              <input
                type="range"
                min={1}
                max={21}
                value={form.default_lead_time}
                onChange={(e) => setForm((f) => ({ ...f, default_lead_time: Number(e.target.value) }))}
                className="w-full accent-[#0F766E]"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-[10px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" /> Ready to Apply Personalization
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div><span className="text-zinc-400">Company:</span> <strong>{form.company_name || "—"}</strong></div>
              <div><span className="text-zinc-400">Industry:</span> <strong>{form.industry}</strong></div>
              <div><span className="text-zinc-400">SKU Scale:</span> <strong>{form.sku_scale}</strong></div>
              <div><span className="text-zinc-400">Team Size:</span> <strong>{form.team_size}</strong></div>
              <div><span className="text-zinc-400">Lead Time:</span> <strong>{form.default_lead_time} days</strong></div>
              <div><span className="text-zinc-400">Primary Goal:</span> <strong>{form.primary_goal}</strong></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-slate-700/70">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-[8px] bg-zinc-100 dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-[8px] bg-[#0E9384] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {saving ? "Saving..." : isEditingExisting ? "Save Setup" : "Complete Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

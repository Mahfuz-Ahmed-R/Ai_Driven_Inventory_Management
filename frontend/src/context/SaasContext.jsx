import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "../utils/apiClient";
import { getStoredTokens } from "../hooks/useAuth";

const SaasContext = createContext(null);

const DEFAULT_TIERS = {
  free: { key: "free", label: "Free", price: 0, max_products: 50, max_jobs: 5, pdf_export: false, policy_benchmark: false, ai_copilot: false },
  basic: { key: "basic", label: "Basic", price: 29, max_products: 250, max_jobs: 25, pdf_export: true, policy_benchmark: false, ai_copilot: false },
  pro: { key: "pro", label: "Pro", price: 79, max_products: 2000, max_jobs: 150, pdf_export: true, policy_benchmark: true, ai_copilot: true },
  enterprise: { key: "enterprise", label: "Enterprise", price: 199, max_products: 999999, max_jobs: 999999, pdf_export: true, policy_benchmark: true, ai_copilot: true },
};

const FALLBACK_STATE = {
  plan_tier: "free",
  tier_config: DEFAULT_TIERS.free,
  all_tiers: DEFAULT_TIERS,
  usage: { products_count: 0, products_limit: 50, jobs_count: 0, jobs_limit: 5 },
  onboarding: { completed: false, step: 0, data: {} },
  referral: { code: "DREAMS-AI-2026", clicks: 0, total_signups: 0, converted: 0, total_earned: 0 },
};

export function SaasProvider({ children }) {
  const [saasState, setSaasState] = useState(FALLBACK_STATE);
  const [saasLoading, setSaasLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refreshSaas = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setSaasState(FALLBACK_STATE);
      setSaasLoading(false);
      return null;
    }
    try {
      const data = await apiRequest("/api/saas/state/");
      setSaasState(data);
      return data;
    } catch {
      return null;
    } finally {
      setSaasLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSaas();
  }, [refreshSaas]);

  const upgradePlan = useCallback(async (planTier) => {
    const prev = saasState;
    setSaasState((s) => ({
      ...s,
      plan_tier: planTier,
      tier_config: s.all_tiers?.[planTier] || DEFAULT_TIERS[planTier],
    }));
    try {
      const updated = await apiRequest("/api/saas/upgrade/", {
        method: "POST",
        body: { plan_tier: planTier },
      });
      setSaasState(updated);
      return updated;
    } catch (err) {
      setSaasState(prev);
      throw err;
    }
  }, [saasState]);

  const openUpgradeModal = useCallback((reason = "") => {
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  }, []);

  const hasFeature = useCallback(
    (featureKey) => Boolean(saasState?.tier_config?.[featureKey]),
    [saasState]
  );

  return (
    <SaasContext.Provider
      value={{
        saasState,
        saasLoading,
        refreshSaas,
        upgradePlan,
        hasFeature,
        upgradeModalOpen,
        setUpgradeModalOpen,
        upgradeReason,
        openUpgradeModal,
        onboardingOpen,
        setOnboardingOpen,
      }}
    >
      {children}
    </SaasContext.Provider>
  );
}

export function useSaas() {
  const ctx = useContext(SaasContext);
  return (
    ctx || {
      saasState: FALLBACK_STATE,
      saasLoading: false,
      refreshSaas: async () => {},
      upgradePlan: async () => {},
      hasFeature: () => true,
      upgradeModalOpen: false,
      setUpgradeModalOpen: () => {},
      upgradeReason: "",
      openUpgradeModal: () => {},
      onboardingOpen: false,
      setOnboardingOpen: () => {},
    }
  );
}

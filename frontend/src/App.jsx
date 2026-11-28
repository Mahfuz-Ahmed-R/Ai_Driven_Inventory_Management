import { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LandingPage from "./components/LandingPage";
import { ComingSoonPage, MaintenancePage, ErrorPage, ErrorBoundary } from "./components/SystemPages";
import UploadView from "./components/UploadView";
import DashboardView from "./components/DashboardView";
import SalesForecastView from "./components/SalesForecastView";
import ProductsView from "./components/ProductsView";
import InventoryView from "./components/InventoryView";
import ReplenishmentView from "./components/ReplenishmentView";
import AnalyticsView from "./components/AnalyticsView";
import SettingsView from "./components/SettingsView";
import InventoryReportView from "./components/InventoryReportView";
import PolicyBenchmarkView from "./components/PolicyBenchmarkView";
import InventoryExtraViews from "./components/InventoryExtraViews";
import StockViews from "./components/StockViews";
import ReportsExtraViews from "./components/ReportsExtraViews";
import PeoplesViews from "./components/PeoplesViews";
import ReferralView from "./components/ReferralView";
import CommandPalette from "./components/CommandPalette";
import ShortcutsModal from "./components/ShortcutsModal";
import OnboardingWizard from "./components/OnboardingWizard";
import { UpgradeModal, FeatureLock } from "./components/ui/TierComponents";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";
import { ConfirmProvider, useConfirm } from "./components/ui/ConfirmDialog";
import { DashboardSkeleton } from "./components/ui/Skeleton";
import { SaasProvider, useSaas } from "./context/SaasContext";
import {
  SalesDashboardView,
  AuthFlowPage,
} from "./components/AuthSystemViews";
import { useAnalysisWebSocket } from "./hooks/useAnalysisWebSocket";
import { useErpData } from "./hooks/useErpData";
import { useAuth } from "./hooks/useAuth";
import { useDebounce } from "./hooks/useDebounce";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { apiRequest } from "./utils/apiClient";

const INVENTORY_PAGES = new Set([
  "expired-products",
  "low-stocks",
  "categories",
  "sub-categories",
]);

const STOCK_PAGES = new Set(["manage-stock", "stock-adjustment"]);

const REPORT_PAGES = new Set([
  "sales-report",
  "purchase-report",
  "invoice-report",
  "supplier-report",
  "customer-report",
  "product-report",
]);

const PEOPLES_PAGES = new Set(["suppliers"]);

const AUTH_FULLSCREEN_TABS = new Set([
  "signin",
  "register",
  "forgot",
  "email-otp",
  "two-step",
  "reset",
  "success",
  "lock",
]);

const WORKSPACE_TABS = new Set([
  "upload",
  "dashboard",
  "sales-forecast",
  "products",
  "inventory",
  "replenishment",
  "analytics",
  "settings",
  "sales-dashboard",
  "referrals",
  "report",
  "policy",
  ...INVENTORY_PAGES,
  ...STOCK_PAGES,
  ...REPORT_PAGES,
  ...PEOPLES_PAGES,
]);

function readInitialTab() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const clean = hash ? decodeURIComponent(hash).split("?")[0] : "";
  return clean || "landing";
}

function AppContent() {
  const [activeTab, setActiveTabState] = useState(readInitialTab);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("dreams_sidebar_collapsed") === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const [wsJobId, setWsJobId] = useState(null);

  const {
    erpData,
    erpLoading,
    erpError,
    refreshErpData,
    optimisticDeleteProduct,
    optimisticBulkProducts,
    optimisticCreateProduct,
  } = useErpData();
  const { user, authLoading, saveAuthSession, logout } = useAuth();
  const { saasState, openUpgradeModal, setOnboardingOpen, refreshSaas, upgradePlan } = useSaas();
  const toast = useToast();
  const confirm = useConfirm();

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dreams_dark_mode");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("dreams_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing workspace...");
      refreshErpData();
      refreshSaas();
    };
    const onOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Drafts will be saved locally.");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const navigateTo = useCallback((tab) => {
    if (tab === "lock" && user) {
      sessionStorage.setItem(
        "dreams_locked_user",
        JSON.stringify({ name: user.name || user.username, email: user.email })
      );
      logout();
    }
    setActiveTabState(tab);
    setMobileMenuOpen(false);
    const nextHash = `#/${encodeURIComponent(tab)}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }, [user, logout]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTabState(readInitialTab());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("dreams_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const loadJobsList = async () => {
    try {
      const list = await apiRequest("/api/jobs/", { retries: 1 });
      setJobs(list);
      return list;
    } catch {
      // Backend offline
    } finally {
      setJobsLoading(false);
    }
    return [];
  };

  const loadJobDetail = async (id) => {
    try {
      const detail = await apiRequest(`/api/jobs/${id}/`, { retries: 1 });
      setActiveJob(detail);
      return detail;
    } catch (err) {
      toast.error(err.message || "Failed to load analysis job");
      return null;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setJobs([]);
      setActiveJob(null);
      setJobsLoading(false);
      return;
    }
    setJobsLoading(true);
    loadJobsList().then((list) => {
      const completed = list.find((j) => j.status === "completed");
      if (completed) {
        loadJobDetail(completed.id);
      }
    });
  }, [authLoading, user]);

  useKeyboardShortcuts({
    onOpenPalette: () => setPaletteOpen((v) => !v),
    onOpenShortcuts: () => setShortcutsOpen((v) => !v),
    onNavigate: navigateTo,
    onEscape: () => {
      setPaletteOpen(false);
      setShortcutsOpen(false);
    },
  });

  const { events, progress, streamedSummary, error: wsError } = useAnalysisWebSocket(
    wsJobId,
    async (completedId) => {
      await loadJobDetail(completedId);
      await loadJobsList();
      await refreshSaas();
      setWsJobId(null);
      navigateTo("dashboard");
      toast.success("Forecast & Digital Twin analysis completed!");
    }
  );

  const handleDeleteJob = async (id) => {
    const ok = await confirm({
      title: "Delete Analysis Job?",
      description: "This will permanently remove the forecast job, SKU predictions, and Digital Twin simulation results.",
      confirmLabel: "Delete Job",
    });
    if (!ok) return;

    const prevJobs = jobs;
    const prevActive = activeJob;
    setJobs((j) => j.filter((item) => item.id !== id));
    if (activeJob?.id === id) setActiveJob(null);

    try {
      await apiRequest(`/api/jobs/${id}/`, { method: "DELETE" });
      toast.success("Analysis job deleted.");
      refreshSaas();
    } catch (err) {
      setJobs(prevJobs);
      setActiveJob(prevActive);
      toast.error(err.message || "Failed to delete job. Restored.");
    }
  };

  const handleAuthSuccess = useCallback(async (authData, { redirectToDashboard = true } = {}) => {
    if (authData?.access) saveAuthSession(authData);
    const pendingPlan = sessionStorage.getItem("dreams_pending_plan");
    if (pendingPlan) {
      sessionStorage.removeItem("dreams_pending_plan");
      try {
        await upgradePlan(pendingPlan);
        toast.success(`Activated ${pendingPlan.toUpperCase()} plan on your workspace.`);
      } catch {
        // ignore if upgrade fails; refreshSaas will load current tier
      }
    }
    await Promise.all([refreshSaas(), refreshErpData()]);
    if (redirectToDashboard) navigateTo("dashboard");
  }, [saveAuthSession, upgradePlan, refreshSaas, refreshErpData, navigateTo, toast]);

  const renderPage = () => {
    if (activeTab === "landing" || activeTab === "signin" || activeTab === "register") {
      return (
        <LandingPage
          onNavigate={navigateTo}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={user}
          initialAuthScreen={activeTab === "landing" ? null : activeTab}
          onAuthSuccess={(authData) => handleAuthSuccess(authData)}
        />
      );
    }

    if (AUTH_FULLSCREEN_TABS.has(activeTab)) {
      if (activeTab === "lock" && !authLoading && !user) {
        let lockedUser = null;
        try {
          lockedUser = JSON.parse(sessionStorage.getItem("dreams_locked_user") || "null");
        } catch {
          lockedUser = null;
        }
        if (!lockedUser) {
          return (
            <LandingPage
              onNavigate={navigateTo}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              user={null}
              initialAuthScreen="signin"
              onAuthSuccess={(authData) => handleAuthSuccess(authData)}
            />
          );
        }
        return (
          <AuthFlowPage
            key="lock-active"
            initialScreen="lock"
            user={lockedUser}
            onNavigate={navigateTo}
            onAuthSuccess={(authData) => handleAuthSuccess(authData)}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      }
      return (
        <AuthFlowPage
          key={activeTab}
          initialScreen={activeTab}
          user={user}
          onNavigate={navigateTo}
          onAuthSuccess={(authData) => handleAuthSuccess(authData)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      );
    }

    if (activeTab === "coming-soon" || activeTab.startsWith("coming:")) {
      const featureName = activeTab.startsWith("coming:") ? activeTab.slice(7) : undefined;
      return <ComingSoonPage featureName={featureName} onNavigate={navigateTo} />;
    }

    if (activeTab === "maintenance") {
      return <MaintenancePage onNavigate={navigateTo} />;
    }

    if (activeTab === "500") {
      return <ErrorPage code="500" onNavigate={navigateTo} />;
    }

    if (activeTab === "404" || !WORKSPACE_TABS.has(activeTab)) {
      return (
        <ErrorPage
          code="404"
          brokenPath={activeTab === "404" ? undefined : `#/${activeTab}`}
          onNavigate={navigateTo}
        />
      );
    }

    if (authLoading) {
      return (
        <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#0F766E] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">Verifying workspace session...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <LandingPage
          onNavigate={navigateTo}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={null}
          initialAuthScreen="signin"
          onAuthSuccess={(authData) =>
            handleAuthSuccess(authData, { redirectToDashboard: !WORKSPACE_TABS.has(activeTab) })
          }
        />
      );
    }

    return (
      <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
          isSignedIn={Boolean(user)}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 md:ml-[74px] ${
            collapsed ? "lg:ml-[74px]" : "lg:ml-[250px]"
          }`}
        >
          <Topbar
            activeJob={activeJob}
            user={user}
            onLogout={async () => {
              await logout();
              await Promise.all([refreshSaas(), refreshErpData()]);
              navigateTo("signin");
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onNavigate={navigateTo}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />

          {!isOnline && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
              Offline mode — changes and form drafts are saved locally and will sync when reconnected.
            </div>
          )}

          <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1400px] w-full mx-auto overflow-x-hidden">
            <div key={activeTab} className="animate-fade-slide-up">
            {activeTab === "upload" && (
              <UploadView
                onUploadSuccess={(id) => setWsJobId(id)}
                onSelectJob={async (id) => {
                  await loadJobDetail(id);
                  navigateTo("dashboard");
                }}
                activeJobId={activeJob?.id}
                activeWsJobId={wsJobId}
                wsProgress={progress}
                wsEvents={events}
                wsStreamedSummary={streamedSummary}
                wsError={wsError}
              />
            )}

            {activeTab === "dashboard" && (
              jobsLoading && !activeJob ? (
                <DashboardSkeleton />
              ) : (
                <DashboardView key={activeJob?.id || "empty"} job={activeJob} erpData={erpData} onNavigate={navigateTo} darkMode={darkMode} user={user} />
              )
            )}

            {activeTab === "sales-forecast" && (
              <SalesForecastView job={activeJob} searchQuery={debouncedSearch} darkMode={darkMode} onNavigate={navigateTo} />
            )}

            {activeTab === "products" && (
              <ProductsView job={activeJob} erpData={erpData} searchQuery={debouncedSearch} darkMode={darkMode} onNavigate={navigateTo} />
            )}

            {activeTab === "inventory" && (
              <InventoryView job={activeJob} searchQuery={debouncedSearch} darkMode={darkMode} onNavigate={navigateTo} />
            )}

            {activeTab === "replenishment" && (
              <ReplenishmentView job={activeJob} searchQuery={debouncedSearch} darkMode={darkMode} onNavigate={navigateTo} />
            )}

            {activeTab === "analytics" && (
              <AnalyticsView job={activeJob} darkMode={darkMode} onNavigate={navigateTo} />
            )}

            {activeTab === "settings" && (
              <SettingsView user={user} />
            )}

            {activeTab === "sales-dashboard" && (
              <SalesDashboardView job={activeJob} erpData={erpData} darkMode={darkMode} />
            )}

            {activeTab === "referrals" && <ReferralView />}

            {INVENTORY_PAGES.has(activeTab) && (
              <InventoryExtraViews
                page={activeTab}
                job={activeJob}
                erpData={erpData}
                erpLoading={erpLoading}
                erpError={erpError}
                refreshErpData={refreshErpData}
                optimisticDeleteProduct={optimisticDeleteProduct}
                optimisticBulkProducts={optimisticBulkProducts}
                optimisticCreateProduct={optimisticCreateProduct}
                searchQuery={debouncedSearch}
                darkMode={darkMode}
                onNavigate={navigateTo}
              />
            )}

            {STOCK_PAGES.has(activeTab) && (
              <StockViews
                page={activeTab}
                job={activeJob}
                erpData={erpData}
                refreshErpData={refreshErpData}
                searchQuery={debouncedSearch}
                darkMode={darkMode}
              />
            )}

            {activeTab === "report" && (
              <InventoryReportView job={activeJob} searchQuery={debouncedSearch} darkMode={darkMode} />
            )}

            {REPORT_PAGES.has(activeTab) && (
              <ReportsExtraViews
                page={activeTab}
                job={activeJob}
                erpData={erpData}
                searchQuery={debouncedSearch}
                darkMode={darkMode}
              />
            )}

            {activeTab === "policy" && (
              <FeatureLock
                featureKey="policy_benchmark"
                requiredTier="Pro"
                title="Policy Benchmark & Simulation"
                description="Compare EOQ, Safety-Stock, and LightGBM ML replenishment policies across 5 disruption seeds. Upgrade to Pro to unlock."
              >
                <PolicyBenchmarkView job={activeJob} darkMode={darkMode} />
              </FeatureLock>
            )}

            {PEOPLES_PAGES.has(activeTab) && (
              <PeoplesViews page={activeTab} job={activeJob} erpData={erpData} refreshErpData={refreshErpData} searchQuery={debouncedSearch} darkMode={darkMode} />
            )}
            </div>
          </main>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary onNavigate={navigateTo}>
      {renderPage()}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigateTo}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenUpgrade={() => openUpgradeModal()}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        skus={activeJob?.skus?.length ? activeJob.skus : erpData?.products || []}
        onSelectSku={(sku) => setSearchQuery(sku)}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <UpgradeModal />
      <OnboardingWizard />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SaasProvider>
          <AppContent />
        </SaasProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

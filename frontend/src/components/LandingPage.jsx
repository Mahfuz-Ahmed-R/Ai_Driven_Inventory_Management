import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Play,
  Check,
  Sun,
  Moon,
  LogIn,
  Menu,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  Package,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Layers,
  Cpu,
  Database,
  Barcode,
  Warehouse,
  UploadCloud,
  Zap,
  Activity,
  Calculator,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import BrandMark from "./BrandMark";
import { AuthCard } from "./AuthSystemViews";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import { useSaas } from "../context/SaasContext";
import { getStoredTokens } from "../hooks/useAuth";
import { useToast } from "./ui/ToastProvider";

const HORIZON_PREVIEW = [
  { day: "D+1", actual: 420, forecast: 412, stock: 1280 },
  { day: "D+4", actual: 465, forecast: 458, stock: 890 },
  { day: "D+7", actual: 590, forecast: 575, stock: 1420 },
  { day: "D+10", actual: 440, forecast: 448, stock: 980 },
  { day: "D+13", actual: 510, forecast: 522, stock: 610 },
  { day: "D+16", actual: 640, forecast: 628, stock: 1350 },
  { day: "D+19", actual: 495, forecast: 504, stock: 860 },
  { day: "D+22", actual: 530, forecast: 520, stock: 1190 },
  { day: "D+25", actual: 685, forecast: 672, stock: 740 },
  { day: "D+28", actual: 560, forecast: 554, stock: 1120 },
];

const ARCHITECTURE_ITEMS = [
  {
    title: "Calendar, seasonality, and occasion engineering",
    body: "Captures weekly retail cycles, continuous circular day-of-year harmonics, pre-holiday stocking countdowns, and post-event demand hangovers across 17 engineered signals.",
    detail: "17 domain features -> 10 orthogonal inputs",
  },
  {
    title: "PCA multicollinearity pruning",
    body: "Decomposes temporal feature correlation to prune redundant lags without sacrificing tree-split fidelity. The 10-feature LightGBM model achieves 0.8264 MAE, outperforming the full 17-feature baseline.",
    detail: "41.2% fewer features, lower MAE",
  },
  {
    title: "Digital Twin replenishment simulator",
    body: "Models daily on-hand shelf stock, 3 to 5 day category supplier lead times, delivery arrivals, and censored demand during stockouts—separating observed POS sales from simulated shelf state.",
    detail: "28-day horizon across 200 SKU-store series",
  },
  {
    title: "Integrated POS and stock execution",
    body: "Connects forecasting directly to daily operations: DreamsPOS checkout, barcode and QR label printing, multi-warehouse transfers, and supplier purchase budgets.",
    detail: "EOQ vs. Safety-Stock vs. ML/AI policy",
  },
];

const BENCHMARKS = [
  {
    model: "Fine-Tuned LightGBM (Tweedie)",
    paradigm: "Tabular GBDT",
    mae: "0.826",
    rmse: "1.18 (1st)",
    latency: "0.05 ms / SKU",
    role: "Primary production engine (RMSE leader)",
  },
  {
    model: "Nixtla TimeGPT (Zero-Shot)",
    paradigm: "Time Series FM",
    mae: "0.985",
    rmse: "1.92 (2nd)",
    latency: "0.60 s / SKU",
    role: "Zero-shot neural baseline",
  },
  {
    model: "Gemini LLM (Zero-Shot)",
    paradigm: "Foundation LLM",
    mae: "1.110",
    rmse: "2.05 (3rd)",
    latency: "1.50 s / SKU",
    role: "Cold-start and event reasoning (MAE co-winner)",
  },
  {
    model: "Seasonal-Naive (Lag 7)",
    paradigm: "Classical Heuristic",
    mae: "1.180",
    rmse: "2.18 (4th)",
    latency: "< 0.01 ms",
    role: "7-day seasonal reference",
  },
];

const PLANS = [
  {
    planKey: "free",
    name: "Free",
    price: "$0",
    period: "Starter sandbox",
    desc: "Starter sandbox for single-store CSV forecasting and quick evaluation.",
    items: ["50 SKUs", "5 Forecast Jobs", "CSV Export"],
    cta: "Start Free",
    actionKey: "register",
  },
  {
    planKey: "basic",
    name: "Basic",
    price: "$29",
    period: "per month",
    desc: "Growing stores needing higher SKU quotas and executive PDF reporting.",
    items: ["250 SKUs", "25 Forecast Jobs", "PDF Executive Reports"],
    cta: "Get Basic",
    actionKey: "dashboard",
  },
  {
    planKey: "pro",
    name: "Pro",
    price: "$79",
    period: "per month",
    highlight: true,
    desc: "AI-driven teams running policy benchmarks and Copilot replenishment.",
    items: ["2,000 SKUs", "150 Forecast Jobs", "Policy Benchmark", "AI Copilot"],
    cta: "Open Pro workspace",
    actionKey: "dashboard",
  },
  {
    planKey: "enterprise",
    name: "Enterprise",
    price: "$199",
    period: "per month",
    desc: "Unlimited scale with priority compute and dedicated SLA governance.",
    items: ["Unlimited SKUs", "Unlimited Jobs", "Priority Compute", "Dedicated SLA"],
    cta: "Select Enterprise",
    actionKey: "dashboard",
  },
];

const PRODUCT_SCREENSHOTS = [
  {
    id: "dashboard",
    label: "AI Dashboard",
    route: "dashboard",
    url: "app.dreamsai.io/#/dashboard",
    image: "/screenshots/dashboard.png",
    icon: LayoutDashboard,
    title: "Executive inventory command center",
    summary:
      "Track 28-day LightGBM demand forecasts, critical stockout risks, projected revenue, and AI-optimized PO budgets in one unified view.",
    highlights: [
      "Real-time stockout countdown banners",
      "95.46%+ simulated 28-day policy fill rate",
      "AI savings vs. classical EOQ benchmarked live",
    ],
  },
  {
    id: "report",
    label: "Replenishment Report",
    route: "report",
    url: "app.dreamsai.io/#/report",
    image: "/screenshots/report.png",
    icon: FileSpreadsheet,
    title: "Actionable SKU-level replenishment orders",
    summary:
      "Know exactly how many units to order, when each SKU will run out, and the total PO cost before supplier lead times catch you off guard.",
    highlights: [
      "Automated CRITICAL & WATCH urgency badges",
      "Daily sales velocity & exact run-out dates",
      "One-click CSV export & Digital Twin drill-down",
    ],
  },
  {
    id: "low-stocks",
    label: "Low-Stock Alerts",
    route: "low-stocks",
    url: "app.dreamsai.io/#/low-stocks",
    image: "/screenshots/low-stocks.png",
    icon: AlertTriangle,
    title: "Proactive stockout prevention",
    summary:
      "Compare remaining days of cover against recommended reorder quantities across warehouses so high-velocity items never hit zero.",
    highlights: [
      "Multi-warehouse & store filtering",
      "Visual days-left vs. reorder quantity chart",
      "Instant email alert dispatch to buyers",
    ],
  },
  {
    id: "sales-dashboard",
    label: "Sales Velocity",
    route: "sales-dashboard",
    url: "app.dreamsai.io/#/sales-dashboard",
    image: "/screenshots/sales-dashboard.png",
    icon: TrendingUp,
    title: "Demand velocity & top-performing SKUs",
    summary:
      "Spot your fastest-moving products over the next 28 days alongside live POS transactions and revenue leaders.",
    highlights: [
      "Top 10 SKUs 28-day predicted demand ranking",
      "Live transaction ledger with payment status",
      "Revenue & unit contribution by category",
    ],
  },
  {
    id: "products",
    label: "Catalog & Stock",
    route: "products",
    url: "app.dreamsai.io/#/products",
    image: "/screenshots/products.png",
    icon: Package,
    title: "On-hand stock vs. 28-day forecast",
    summary:
      "Audit current warehouse quantities directly against predicted 28-day demand to spot understocked winners and slow-moving capital.",
    highlights: [
      "Side-by-side current stock vs. forecast bars",
      "Fast SKU, category, and brand search",
      "Bulk CSV import & column customization",
    ],
  },
  {
    id: "pos",
    label: "POS Terminal",
    route: "pos",
    url: "app.dreamsai.io/#/pos",
    image: "/screenshots/pos.png",
    icon: ShoppingCart,
    title: "Integrated DreamsPOS checkout",
    summary:
      "Every checkout transaction updates shelf inventory in real time—closing the loop between point-of-sale execution and AI replenishment.",
    highlights: [
      "Live stock badges on every product tile",
      "Category tabs, discount, tax, and split payments",
      "Session revenue tracking by product category",
    ],
  },
];

const VALUE_PILLARS = [
  {
    icon: ShieldCheck,
    title: "Stop stockouts & overstock",
    body: "Balance 3–5 day supplier lead times against 28-day demand surges before shelves run dry or capital gets trapped.",
  },
  {
    icon: Activity,
    title: "Transparent ML forecasting",
    body: "Full visibility into PCA-pruned features, Tweedie LightGBM vs. TimeGPT & Gemini benchmarks, and exact SKU run-out dates.",
  },
  {
    icon: ShoppingCart,
    title: "Closed-loop POS execution",
    body: "Every DreamsPOS checkout updates live warehouse inventory and recalculates recommended purchase order budgets automatically.",
  },
];

const PLATFORM_STACK = [
  { name: "CSV & M5 Ledger", category: "Data Ingestion", icon: UploadCloud, route: "upload" },
  { name: "LightGBM Tweedie", category: "Primary Forecast Engine", icon: Cpu, route: "dashboard" },
  { name: "Nixtla TimeGPT", category: "Zero-Shot Time Series", icon: Zap, route: "policy" },
  { name: "Gemini Zero-Shot", category: "Cold-Start & Events", icon: Sparkles, route: "policy" },
  { name: "Digital Twin Sim", category: "28-Day Shelf Model", icon: Layers, route: "policy" },
  { name: "DreamsPOS Terminal", category: "Live Retail Checkout", icon: ShoppingCart, route: "pos" },
  { name: "Multi-Warehouse", category: "Stock Transfers", icon: Warehouse, route: "manage-stock" },
  { name: "Barcode & QR Print", category: "Label Generation", icon: Barcode, route: "print-barcode" },
  { name: "SQLite / Postgres", category: "ERP & SKU Store", icon: Database, route: "products" },
];

const IMPACT_METRICS = [
  { value: "98.7%", label: "Simulated ML replenishment policy fill rate across 200 SKU-store series" },
  { value: "0.826", label: "LightGBM Tweedie MAE, leading TimeGPT, Gemini & Seasonal-Naive" },
  { value: "-41.2%", label: "Feature reduction via PCA multicollinearity pruning (17 to 10 inputs)" },
  { value: "0.05 ms", label: "Inference latency per SKU for instant 28-day horizon updates" },
  { value: "28 Days", label: "Digital Twin shelf simulation with 3–5 day supplier lead times" },
  { value: "4 Models", label: "Forecasting paradigms benchmarked side-by-side in one workspace" },
];

const RESOURCE_COLUMNS = [
  {
    heading: "Read",
    items: [
      {
        title: "Blog",
        desc: "Forecasting, buying and retail ops, weekly",
        category: "Read • Weekly Insights",
        highlights: [
          "Why Tweedie LightGBM beats classical seasonal-naive on intermittent retail demand",
          "Handling censored POS sales during stockouts with Digital Twin simulation",
          "Practical PCA feature pruning for faster multi-store SKU inference",
        ],
        ctaLabel: "Inspect model benchmarks",
        scrollTarget: "benchmarks",
      },
      {
        title: "Guides",
        desc: "Playbooks on demand, cash and stock cover",
        category: "Read • Playbooks",
        highlights: [
          "Setting safety-stock buffers for 3–5 day supplier lead times",
          "Balancing working capital vs. 98%+ shelf fill rate",
          "When to switch between EOQ, Safety-Stock, and ML replenishment policies",
        ],
        ctaLabel: "Open Policy Simulator",
        route: "policy",
      },
      {
        title: "Retail Tariffs",
        desc: "What tariff changes do to your landed cost",
        category: "Read • Margin Protection",
        highlights: [
          "Modeling landed-cost shifts inside SKU purchase order budgets",
          "Prioritizing high-GMROI A-class variants before supplier price hikes",
          "Avoiding over-ordering slow-moving stock during tariff transitions",
        ],
        ctaLabel: "Open Replenishment Report",
        route: "report",
      },
      {
        title: "Product brochure",
        desc: "Every feature in one PDF, built to forward",
        category: "Read • Platform Overview",
        highlights: [
          "Full 4-paradigm forecasting suite: LightGBM, TimeGPT, Gemini, Seasonal-Naive",
          "28-day Digital Twin shelf simulator & automated PO recommendations",
          "Integrated DreamsPOS terminal, barcode/QR printing, and multi-warehouse stock",
        ],
        ctaLabel: "Explore workspace live",
        route: "dashboard",
      },
    ],
  },
  {
    heading: "Watch & Listen",
    items: [
      {
        title: "Inventory Masterclass Series",
        desc: "Retail expert insights and strategies for success to avoid risk and boost profit",
        category: "Watch & Listen • Masterclass",
        highlights: [
          "Live walkthrough of 28-day SKU demand forecasting and reorder triggers",
          "Eliminating spreadsheet blind spots across multi-warehouse operations",
          "Real-time POS-to-warehouse replenishment loops",
        ],
        ctaLabel: "Upload Sales CSV",
        route: "upload",
      },
      {
        title: "Commerce Conversations",
        desc: "A webinar series bringing you real stories from retailers",
        category: "Watch & Listen • Webinar Series",
        highlights: [
          "How retail planners cut weekly manual purchasing prep by 50%+ hours",
          "Managing seasonal surges and holiday hangovers without overstocking",
          "Auditing forecast accuracy with strict chronological splits",
        ],
        ctaLabel: "Book a 30-minute walkthrough",
        action: "book",
      },
      {
        title: "Spreadsheet retirement party",
        desc: "The day the sheet stops keeping up",
        category: "Watch & Listen • Migration Guide",
        highlights: [
          "Import your existing sales CSV ledger in under 60 seconds",
          "Automatic SKU velocity, days-left, and run-out date calculation",
          "Replace fragile VLOOKUPs with live Digital Twin simulations",
        ],
        ctaLabel: "Upload your CSV now",
        route: "upload",
      },
    ],
  },
  {
    heading: "Learn & Get Answers",
    items: [
      {
        title: "Inventory Planning Bootcamp",
        desc: "Four live sessions, next intake in September",
        category: "Learn • Bootcamp",
        highlights: [
          "Session 1: Preparing clean POS sales & SKU ledgers",
          "Session 2: Interpreting MAE, RMSE, and 28-day fill-rate benchmarks",
          "Session 3 & 4: Automated PO workflows and multi-warehouse transfers",
        ],
        ctaLabel: "Reserve your spot",
        action: "book",
      },
      {
        title: "FAQs",
        desc: "Get all your questions about Inventory Planner answered here",
        category: "Learn • Frequently Asked Questions",
        highlights: [
          "What data format is needed? Any CSV with date, SKU, quantity, and stock.",
          "How fast is forecasting? LightGBM infers at 0.05 ms per SKU.",
          "Can I test with my own catalog? Yes—upload any sales CSV to generate your forecast.",
        ],
        ctaLabel: "Try live workspace",
        route: "dashboard",
      },
      {
        title: "Help Center",
        desc: "Setup docs, release notes and support",
        category: "Learn • Documentation",
        highlights: [
          "Quickstart: Workspace onboarding wizard & default lead-time setup",
          "Keyboard shortcuts: Press Ctrl+K for Command Palette or Shift+? for help",
          "API & Webhooks documentation for ERP and POS synchronization",
        ],
        ctaLabel: "Open CSV Uploader",
        route: "upload",
      },
    ],
  },
];

const FEATURE_COLUMNS = [
  {
    heading: "Plan & Buy",
    items: [
      {
        title: "Demand Forecasting",
        desc: "Predict what customers will buy, SKU by SKU",
        shotIdx: 0,
      },
      {
        title: "Replenishment & POs",
        desc: "Know what to order, when and where",
        shotIdx: 1,
      },
      {
        title: "Low-Stock Alerts",
        desc: "Prevent stockouts before supplier lead times hit",
        shotIdx: 2,
      },
    ],
  },
  {
    heading: "Measure & Decide",
    items: [
      {
        title: "Inventory Reporting",
        desc: "Key inventory planning performance metrics, top-level down to SKU",
        shotIdx: 4,
      },
      {
        title: "Retail Analytics",
        desc: "Track 28-day velocity, best sellers, and revenue",
        shotIdx: 3,
      },
      {
        title: "POS Terminal",
        desc: "Closed-loop checkout synced with live shelf stock",
        shotIdx: 5,
      },
    ],
  },
  {
    heading: "AI Built In",
    items: [
      {
        title: "Digital Twin Simulator",
        desc: "Your 28-day shelf & lead-time simulator for inventory insights",
        route: "policy",
      },
      {
        title: "4-Model AI Engine",
        desc: "LightGBM Tweedie, TimeGPT, Gemini & Seasonal-Naive benchmarks",
        scrollTarget: "benchmarks",
      },
    ],
  },
];

const FEATURED_GUIDE = {
  title: "2026 Retail Forecast & Benchmarking Guide",
  desc: "Exclusive retail market insights and M5 benchmark findings for inventory leaders.",
  category: "Featured Guide • 2026 Edition",
  highlights: [
    "Full comparison of LightGBM Tweedie (0.8264 MAE), TimeGPT, Gemini Zero-Shot, and Seasonal-Naive",
    "How 10 PCA-pruned features deliver 98.7% simulated shelf fill rate",
    "Actionable replenishment playbook for 2026 margin and tariff resilience",
  ],
  ctaLabel: "Inspect live benchmark",
  scrollTarget: "benchmarks",
};

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function LandingPage({
  onNavigate,
  darkMode,
  setDarkMode,
  user,
  initialAuthScreen = null,
  onAuthSuccess,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const closeMenuTimerRef = useRef(null);

  const openHoverMenu = (menuName) => {
    if (closeMenuTimerRef.current) {
      clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
    setOpenMenu(menuName);
  };

  const scheduleCloseMenu = () => {
    if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
    closeMenuTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 180);
  };
  const [previewMode, setPreviewMode] = useState("forecast");
  const [activeShotIdx, setActiveShotIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [scrolledDown, setScrolledDown] = useState(false);

  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [roiRevenue, setRoiRevenue] = useState(120000);
  const [roiSkus, setRoiSkus] = useState(850);
  const [activeResource, setActiveResource] = useState(null);
  const [authScreen, setAuthScreen] = useState(initialAuthScreen);
  const [authEmail, setAuthEmail] = useState(user?.email || "");

  useEffect(() => {
    setAuthScreen(initialAuthScreen);
  }, [initialAuthScreen]);

  useEffect(() => {
    if (!authScreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authScreen]);

  const closeAuthModal = () => {
    setAuthScreen(null);
    if (initialAuthScreen) {
      onNavigate("landing");
    }
  };

  const { saasState, upgradePlan } = useSaas();
  const toast = useToast();

  const handleSelectPlan = async (plan) => {
    const isAuthenticated = Boolean(user || getStoredTokens().access);
    if (isAuthenticated) {
      if (plan.planKey !== saasState?.plan_tier) {
        try {
          await upgradePlan(plan.planKey);
          toast.success(`Switched workspace to ${plan.name} plan.`);
        } catch (err) {
          toast.error(err.message || "Failed to update plan");
          return;
        }
      }
      onNavigate("dashboard");
      return;
    }
    if (plan.planKey !== "free") {
      sessionStorage.setItem("dreams_pending_plan", plan.planKey);
      toast.info(`Create an account or sign in to activate the ${plan.name} plan.`);
    } else {
      sessionStorage.removeItem("dreams_pending_plan");
    }
    handleLandingAction("register");
  };

  const handleLandingAction = (target) => {
    if (target === "signin" || target === "register") {
      setMobileNavOpen(false);
      setOpenMenu(null);
      setAuthScreen(target);
      return;
    }
    onNavigate(target);
  };

  const activeShot = PRODUCT_SCREENSHOTS[activeShotIdx];
  const prevShot = () => setActiveShotIdx((i) => (i - 1 + PRODUCT_SCREENSHOTS.length) % PRODUCT_SCREENSHOTS.length);
  const nextShot = () => setActiveShotIdx((i) => (i + 1) % PRODUCT_SCREENSHOTS.length);

  useEffect(() => {
    const onScroll = () => setScrolledDown(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setRoiModalOpen(false);
        setActiveResource(null);
        closeAuthModal();
        setOpenMenu(null);
      } else if (lightboxOpen && e.key === "ArrowLeft") {
        prevShot();
      } else if (lightboxOpen && e.key === "ArrowRight") {
        nextShot();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen]);

  const scrollTo = (id) => {
    setMobileNavOpen(false);
    setOpenMenu(null);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const jumpToShot = (idx) => {
    setActiveShotIdx(idx);
    setOpenMenu(null);
    document.getElementById("showcase")?.scrollIntoView({ behavior: "smooth" });
  };

  const estimatedCashFreed = Math.round(roiRevenue * 12 * 0.085);
  const estimatedHoursSaved = Math.max(6, Math.round(roiSkus / 35));

  return (
    <div className="min-h-screen bg-[#F7F6F2] dark:bg-[#111318] text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Announcement Strip */}
      {showBanner && (
        <div className="bg-white dark:bg-[#181B22] border-b border-[#E5E3DC] dark:border-[#262A34] px-4 pr-9 py-2 text-center text-xs text-zinc-600 dark:text-zinc-300 relative">
          <span>
            M5 Retail Benchmark: <strong className="text-zinc-950 dark:text-white">98.7% ML policy fill rate</strong> and{" "}
            <strong className="text-zinc-950 dark:text-white">0.8264 MAE</strong> with 10 PCA-pruned features.
          </span>{" "}
          <button
            onClick={() => scrollTo("benchmarks")}
            className="font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline ml-1.5 cursor-pointer"
          >
            Inspect benchmark →
          </button>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F7F6F2]/95 dark:bg-[#111318]/95 backdrop-blur-sm border-b border-[#E5E3DC] dark:border-[#262A34]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer min-w-0"
            title="Refresh Inventory Planner"
          >
            <BrandMark />
            <div className="text-left leading-tight min-w-0">
              <div className="font-bold text-sm sm:text-[16px] text-zinc-900 dark:text-white truncate">Inventory Planner</div>
              <div className="hidden sm:block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">AI Inventory Twin</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 h-full">
            <div
              className="h-full flex items-center"
              onMouseEnter={() => openHoverMenu("features")}
              onMouseLeave={scheduleCloseMenu}
            >
              <button
                type="button"
                onClick={() => (openMenu === "features" ? setOpenMenu(null) : openHoverMenu("features"))}
                className={`inline-flex items-center gap-1 h-full px-1 transition cursor-pointer ${
                  openMenu === "features"
                    ? "text-[#0F766E] dark:text-[#14B8A6]"
                    : "hover:text-[#0F766E] dark:hover:text-[#14B8A6]"
                }`}
              >
                <span>Features</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "features" ? "rotate-180" : ""}`} />
              </button>
              {openMenu === "features" && (
                <div
                  onMouseEnter={() => openHoverMenu("features")}
                  onMouseLeave={scheduleCloseMenu}
                  className="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-[min(96vw,920px)] z-50 animate-modal-pop"
                >
                  <div className="bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] rounded-[12px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    {/* 3 Left Columns: Plan & Buy, Measure & Decide, AI Built In */}
                    <div className="md:col-span-8 p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {FEATURE_COLUMNS.map((col) => (
                        <div key={col.heading} className="space-y-4">
                          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {col.heading}
                          </div>
                          <div className="space-y-3.5">
                            {col.items.map((item) => (
                              <button
                                key={item.title}
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  if (typeof item.shotIdx === "number") jumpToShot(item.shotIdx);
                                  else if (item.route) onNavigate(item.route);
                                  else if (item.scrollTarget) scrollTo(item.scrollTarget);
                                }}
                                className="block w-full text-left group cursor-pointer"
                              >
                                <div className="text-[13px] font-semibold text-zinc-900 dark:text-white group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] transition">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                                  {item.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Featured Column: Start Here */}
                    <div className="md:col-span-4 bg-[#F7F6F2] dark:bg-[#111318] border-t md:border-t-0 md:border-l border-[#E5E3DC] dark:border-[#262A34] p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Start Here
                        </div>
                        <div className="rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] p-3.5 space-y-3">
                          <div className="rounded-[6px] bg-gradient-to-br from-[#0F766E] to-[#064E3B] p-4 text-white space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-200">
                              AI Forecast
                            </div>
                            <div className="text-3xl font-extrabold tracking-tight tabular-nums">28D</div>
                            <div className="text-[11px] text-teal-100">Built around your catalogue</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-zinc-950 dark:text-white">
                              Upload your sales CSV
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Generate real SKU forecasts</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onNavigate("upload");
                            }}
                            className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Upload CSV</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            scrollTo("benchmarks");
                          }}
                          className="text-xs font-semibold text-zinc-900 dark:text-white hover:text-[#0F766E] dark:hover:text-[#14B8A6] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect 2026 benchmarks</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          98.7% ML fill rate • 0.05 ms / SKU
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => scrollTo("architecture")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
              Architecture
            </button>
            <button onClick={() => scrollTo("benchmarks")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
              Benchmarks
            </button>
            <button onClick={() => scrollTo("plans")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
              Pricing
            </button>

            <div
              className="h-full flex items-center"
              onMouseEnter={() => openHoverMenu("resources")}
              onMouseLeave={scheduleCloseMenu}
            >
              <button
                type="button"
                onClick={() => (openMenu === "resources" ? setOpenMenu(null) : openHoverMenu("resources"))}
                className={`inline-flex items-center gap-1 h-full px-1 transition cursor-pointer ${
                  openMenu === "resources"
                    ? "text-[#0F766E] dark:text-[#14B8A6]"
                    : "hover:text-[#0F766E] dark:hover:text-[#14B8A6]"
                }`}
              >
                <span>Resources</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "resources" ? "rotate-180" : ""}`} />
              </button>
              {openMenu === "resources" && (
                <div
                  onMouseEnter={() => openHoverMenu("resources")}
                  onMouseLeave={scheduleCloseMenu}
                  className="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-[min(96vw,920px)] z-50 animate-modal-pop"
                >
                  <div className="bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] rounded-[12px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    {/* 3 Left Columns: Read, Watch & Listen, Learn & Get Answers */}
                    <div className="md:col-span-8 p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {RESOURCE_COLUMNS.map((col) => (
                        <div key={col.heading} className="space-y-4">
                          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {col.heading}
                          </div>
                          <div className="space-y-3.5">
                            {col.items.map((item) => (
                              <button
                                key={item.title}
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  setActiveResource(item);
                                }}
                                className="block w-full text-left group cursor-pointer"
                              >
                                <div className="text-[13px] font-semibold text-zinc-900 dark:text-white group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] transition">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                                  {item.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Featured Column: Start Here */}
                    <div className="md:col-span-4 bg-[#F7F6F2] dark:bg-[#111318] border-t md:border-t-0 md:border-l border-[#E5E3DC] dark:border-[#262A34] p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Start Here
                        </div>
                        <div className="rounded-[8px] overflow-hidden border border-[#E5E3DC] dark:border-[#262A34] bg-[#181B22]">
                          <div className="relative">
                            <img
                              src="/screenshots/dashboard.png"
                              alt="2026 Retail Forecast & Benchmarking Guide"
                              className="w-full h-28 object-cover object-top opacity-85"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 flex flex-col justify-end">
                              <span className="inline-block w-fit px-1.5 py-0.5 rounded bg-[#14B8A6] text-zinc-950 text-[9px] font-bold uppercase">
                                Free Guide
                              </span>
                              <div className="text-[11px] font-bold text-white leading-tight mt-1">
                                Planning Ahead: 2026 Retail Forecast &amp; Benchmarking
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-zinc-950 dark:text-white">
                            {FEATURED_GUIDE.title}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                            {FEATURED_GUIDE.desc}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            setActiveResource(FEATURED_GUIDE);
                          }}
                          className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Get guide</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            onNavigate("dashboard");
                          }}
                          className="text-xs font-semibold text-zinc-900 dark:text-white hover:text-[#0F766E] dark:hover:text-[#14B8A6] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          98.7% simulated fill rate • M5 retail benchmark
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle color theme"
              className="p-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!user && (
              <button
                onClick={() => handleLandingAction("signin")}
                className="inline-flex px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] text-xs sm:text-[13px] font-medium hover:border-zinc-400 dark:hover:border-zinc-600 transition cursor-pointer items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </button>
            )}
            <button
              onClick={() => onNavigate("dashboard")}
              className="hidden sm:inline-flex px-3.5 sm:px-4 py-2 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-[13px] font-semibold transition cursor-pointer items-center gap-1.5"
            >
              <span>Open workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden px-4 pb-4 pt-2 border-t border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] space-y-1.5 text-[13px] font-medium">
            <button onClick={() => scrollTo("showcase")} className="block w-full text-left py-2 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              Product tour
            </button>
            <button onClick={() => scrollTo("architecture")} className="block w-full text-left py-2 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              Architecture
            </button>
            <button onClick={() => scrollTo("benchmarks")} className="block w-full text-left py-2 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              Benchmarks
            </button>
            <button onClick={() => scrollTo("plans")} className="block w-full text-left py-2 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              Plans
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigate("policy");
              }}
              className="block w-full text-left py-2 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Policy simulator
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleLandingAction("signin")}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] font-semibold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  onNavigate("dashboard");
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-[6px] bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-zinc-950 font-semibold cursor-pointer"
              >
                <span>Open workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero: Asymmetric Editorial + Live Horizon Chart */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-18 pb-14 sm:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <h1 className="text-3xl sm:text-[42px] font-bold text-zinc-950 dark:text-white leading-[1.15]">
            Demand forecasting built for real shelf constraints
          </h1>

          <p className="text-[15px] sm:text-base text-zinc-600 dark:text-zinc-300 max-w-xl leading-relaxed">
            Inventory Planner pairs fine-tuned LightGBM Tweedie forecasting with a 28-day Digital Twin simulator—modeling
            supplier lead times, holiday surges, and censored stockout demand before you issue a purchase order.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate("dashboard")}
              className="px-5 py-2.5 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-sm font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              Explore workspace <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("upload")}
              className="px-5 py-2.5 rounded-[6px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-900 dark:text-zinc-100 text-sm font-medium inline-flex items-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-500 transition cursor-pointer"
            >
              Upload Sales CSV
            </button>
          </div>

          <div className="pt-6 border-t border-[#E5E3DC] dark:border-[#262A34] grid grid-cols-3 gap-3 sm:gap-6 max-w-lg">
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-zinc-950 dark:text-white">98.7%</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">ML policy fill rate</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-zinc-950 dark:text-white">-41.2%</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">PCA-pruned features</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-zinc-950 dark:text-white font-mono">0.05 ms</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Inference per SKU</div>
            </div>
          </div>
        </div>

        {/* Interactive 28-Day Horizon Preview */}
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  28-day horizon sample (d_1627 to d_1654)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Observed M5 demand vs. simulated replenishment envelope
                </p>
              </div>
              <div className="inline-flex rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] p-0.5 border border-[#E5E3DC] dark:border-[#262A34] text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode("forecast")}
                  className={`px-2.5 py-1 rounded-[5px] font-medium transition cursor-pointer ${
                    previewMode === "forecast"
                      ? "bg-white dark:bg-[#181B22] text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  Demand
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("stock")}
                  className={`px-2.5 py-1 rounded-[5px] font-medium transition cursor-pointer ${
                    previewMode === "stock"
                      ? "bg-white dark:bg-[#181B22] text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  Shelf stock
                </button>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {previewMode === "forecast" ? (
                  <AreaChart data={HORIZON_PREVIEW} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262A34" : "#E5E3DC"} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717A" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                    <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Observed sales"
                      stroke="#71717A"
                      fill="#71717A"
                      fillOpacity={0.12}
                      strokeWidth={1.75}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      name="LightGBM Tweedie"
                      stroke={darkMode ? "#14B8A6" : "#0F766E"}
                      fill={darkMode ? "#14B8A6" : "#0F766E"}
                      fillOpacity={0.18}
                      strokeWidth={2.25}
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={HORIZON_PREVIEW} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262A34" : "#E5E3DC"} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717A" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                    <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                    <ReferenceLine
                      y={650}
                      stroke="#D97706"
                      strokeDasharray="4 4"
                      label={{ value: "Reorder point", position: "insideTopRight", fill: "#D97706", fontSize: 10 }}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="stock"
                      name="Simulated on-hand stock"
                      stroke="#D97706"
                      fill="#D97706"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Evaluated across 200 M5 SKU-store series</span>
              <button
                onClick={() => onNavigate("policy")}
                className="font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer"
              >
                Inspect policy benchmark →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Card Floating Workspace Showcase Strip (below Hero) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative rounded-[12px] border border-[#E5E3DC] dark:border-[#262A34] bg-white/70 dark:bg-[#181B22]/70 p-4 sm:p-6 overflow-hidden">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[220px] rounded-full bg-[#0F766E]/12 dark:bg-[#14B8A6]/15 blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Floating Card: Dashboard */}
            <button
              type="button"
              onClick={() => jumpToShot(0)}
              className="md:col-span-4 text-left rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#181B22] overflow-hidden shadow-md hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition group cursor-pointer"
            >
              <div className="px-3 py-2 bg-[#1F232D] border-b border-[#262A34] flex items-center justify-between text-[11px] text-zinc-300">
                <span className="font-semibold">AI Dashboard</span>
                <span className="text-[#14B8A6] font-mono">95.46% fill</span>
              </div>
              <img
                src="/screenshots/dashboard.png"
                alt="DreamsAI Executive Dashboard"
                className="w-full h-44 object-cover object-top group-hover:scale-[1.02] transition duration-300"
                loading="lazy"
              />
            </button>

            {/* Center Elevated Card: Replenishment Report */}
            <button
              type="button"
              onClick={() => jumpToShot(1)}
              className="md:col-span-4 text-left rounded-[8px] border-2 border-[#0F766E] dark:border-[#14B8A6] bg-[#181B22] overflow-hidden shadow-xl md:-my-2 transition group cursor-pointer animate-subtle-float"
            >
              <div className="px-3 py-2 bg-[#1F232D] border-b border-[#262A34] flex items-center justify-between text-[11px] text-zinc-200">
                <span className="font-semibold">Priority Replenishments</span>
                <span className="px-1.5 py-0.5 rounded bg-[#14B8A6]/20 text-[#14B8A6] font-mono text-[10px]">
                  PO Engine
                </span>
              </div>
              <img
                src="/screenshots/report.png"
                alt="DreamsAI Replenishment Report"
                className="w-full h-48 object-cover object-top group-hover:scale-[1.02] transition duration-300"
                loading="lazy"
              />
            </button>

            {/* Right Floating Card: Low-Stock Alerts */}
            <button
              type="button"
              onClick={() => jumpToShot(2)}
              className="md:col-span-4 text-left rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#181B22] overflow-hidden shadow-md hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition group cursor-pointer"
            >
              <div className="px-3 py-2 bg-[#1F232D] border-b border-[#262A34] flex items-center justify-between text-[11px] text-zinc-300">
                <span className="font-semibold">Low-Stock Alerts</span>
                <span className="text-amber-400 font-mono">Run-out dates</span>
              </div>
              <img
                src="/screenshots/low-stocks.png"
                alt="DreamsAI Low-Stock Alerts"
                className="w-full h-44 object-cover object-top group-hover:scale-[1.02] transition duration-300"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </section>

      {/* Value Proposition 3-Card Section */}
      <section className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6]">
              Built for shelf accuracy
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
              Unrivalled inventory intelligence for modern retail operations
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Get a bigger return on your inventory investment with PCA-pruned ML forecasting, reliable buying
              suggestions, and live POS feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2]/60 dark:bg-[#111318]/80 p-6 space-y-3"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 border border-[#0F766E]/20 dark:border-[#14B8A6]/25 flex items-center justify-center text-[#0F766E] dark:text-[#14B8A6]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">{pillar.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{pillar.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Showcase: Vertical-Tabbed Interactive Workspace Tour */}
      <section
        id="showcase"
        className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] text-[11px] font-semibold tracking-wide uppercase">
                Why use Inventory Planner
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white">
                Reduce excess inventory and eliminate stockouts
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Select any workflow below to inspect the live screen, key operational metrics, and replenishment actions.
              </p>
            </div>
            <button
              onClick={() => onNavigate(activeShot.route)}
              className="px-4 py-2 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Try {activeShot.label} live</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Two-Column Vertical Tab Showcase (Inventory Planner pattern in DreamsAI aesthetic) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 6 Vertical Tabs + Active Details */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] overflow-hidden divide-y divide-[#E5E3DC] dark:divide-[#262A34]">
                {PRODUCT_SCREENSHOTS.map((shot, idx) => {
                  const Icon = shot.icon;
                  const isActive = idx === activeShotIdx;
                  return (
                    <button
                      key={shot.id}
                      type="button"
                      onClick={() => setActiveShotIdx(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition cursor-pointer border-l-[3px] ${
                        isActive
                          ? "bg-[#0F766E]/[0.07] dark:bg-[#14B8A6]/10 border-l-[#0F766E] dark:border-l-[#14B8A6] text-zinc-950 dark:text-white"
                          : "border-l-transparent text-zinc-600 dark:text-zinc-400 hover:bg-[#F7F6F2]/70 dark:hover:bg-[#111318]/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-[#0F766E] dark:text-[#14B8A6]" : "text-zinc-400"
                          }`}
                        />
                        <span className="text-[13px] font-semibold truncate">{shot.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">0{idx + 1}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Summary Card */}
              <div
                key={activeShot.id}
                className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] p-5 space-y-4 animate-fade-slide-up"
              >
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white leading-snug">
                  {activeShot.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {activeShot.summary}
                </p>

                <ul className="space-y-2 pt-3 border-t border-[#E5E3DC] dark:border-[#262A34]">
                  {activeShot.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate(activeShot.route)}
                    className="text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Open {activeShot.label} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Expand
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Browser-Framed Product Screenshot */}
            <div className="lg:col-span-8">
              <div className="rounded-[10px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#181B22] overflow-hidden shadow-lg">
                <div className="px-4 py-2.5 bg-[#1F232D] border-b border-[#262A34] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex-1 max-w-md mx-auto px-3 py-1 rounded bg-[#111318] border border-[#262A34] text-[11px] font-mono text-zinc-400 text-center truncate">
                    {activeShot.url}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevShot}
                      aria-label="Previous screenshot"
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextShot}
                      aria-label="Next screenshot"
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Expand screenshot"
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full text-left group relative cursor-zoom-in focus:outline-none"
                >
                  <img
                    key={activeShot.image}
                    src={activeShot.image}
                    alt={`${activeShot.label} — ${activeShot.title}`}
                    className="w-full h-auto block object-cover animate-fade-slide-up"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition px-3 py-1.5 rounded-full bg-zinc-950/85 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow">
                      <Maximize2 className="w-3.5 h-3.5" /> Click to inspect full screen
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PRODUCT_SCREENSHOTS.map((shot, idx) => {
              const isActive = idx === activeShotIdx;
              return (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => setActiveShotIdx(idx)}
                  className={`group text-left rounded-[8px] overflow-hidden border transition cursor-pointer bg-white dark:bg-[#181B22] ${
                    isActive
                      ? "border-[#0F766E] dark:border-[#14B8A6] ring-2 ring-[#0F766E]/20 dark:ring-[#14B8A6]/25"
                      : "border-[#E5E3DC] dark:border-[#262A34] opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[#111318]">
                    <img
                      src={shot.image}
                      alt={shot.label}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2.5 py-2 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {shot.label}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">0{idx + 1}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture: Asymmetric 2-Column Editorial Breakdown */}
      <section
        id="architecture"
        className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white leading-snug">
              From raw POS ledgers to replenishment orders
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Point-of-sale data records what was sold, not what customers wanted when shelves were empty. Our pipeline
              separates observed sales telemetry from simulated inventory assumptions.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate("upload")}
                className="text-sm font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                Upload a dataset to test <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 divide-y divide-[#E5E3DC] dark:divide-[#262A34]">
            {ARCHITECTURE_ITEMS.map((item) => (
              <div key={item.title} className="py-6 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6">
                <div className="sm:col-span-5">
                  <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{item.title}</h3>
                  <div className="text-xs font-mono text-[#0F766E] dark:text-[#14B8A6] mt-1">{item.detail}</div>
                </div>
                <p className="sm:col-span-7 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benchmarks: Clean Empirical Comparison */}
      <section id="benchmarks" className="border-t border-[#E5E3DC] dark:border-[#262A34]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-1.5">
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
                Four-paradigm forecasting benchmark
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Strict chronological split (d_1627 to d_1654) comparing classical heuristics, tabular GBDT, foundation
                LLMs, and neural time-series models.
              </p>
            </div>
            <button
              onClick={() => onNavigate("dashboard")}
              className="text-sm font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline cursor-pointer"
            >
              Open full dashboard →
            </button>
          </div>

          <div className="bg-white dark:bg-[#181B22] rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#F7F6F2] dark:bg-[#111318] border-b border-[#E5E3DC] dark:border-[#262A34] text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <th className="py-3.5 px-5">Model</th>
                    <th className="py-3.5 px-5">Paradigm</th>
                    <th className="py-3.5 px-5 text-right">MAE</th>
                    <th className="py-3.5 px-5 text-right">RMSE (Rank)</th>
                    <th className="py-3.5 px-5 text-right">Latency</th>
                    <th className="py-3.5 px-5">Production role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DC] dark:divide-[#262A34] tabular-nums">
                  {BENCHMARKS.map((b, i) => (
                    <tr key={b.model} className={i === 0 ? "bg-[#0F766E]/[0.03] dark:bg-[#14B8A6]/[0.04]" : ""}>
                      <td className="py-3.5 px-5 font-semibold text-zinc-950 dark:text-white">{b.model}</td>
                      <td className="py-3.5 px-5 text-zinc-600 dark:text-zinc-400">{b.paradigm}</td>
                      <td className="py-3.5 px-5 text-right font-mono">{b.mae}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-medium">{b.rmse}</td>
                      <td className="py-3.5 px-5 text-right font-mono text-zinc-600 dark:text-zinc-400">{b.latency}</td>
                      <td className="py-3.5 px-5 text-zinc-700 dark:text-zinc-300">{b.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-sm">
            <div className="p-5 rounded-[8px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34]">
              <div className="font-semibold text-zinc-950 dark:text-white">Why LightGBM leads on RMSE</div>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Tweedie compound Poisson-gamma loss captures weekend surges and holiday run-ups accurately, avoiding
                quadratic outlier penalties on high-velocity SKUs.
              </p>
            </div>
            <div className="p-5 rounded-[8px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34]">
              <div className="font-semibold text-zinc-950 dark:text-white">Where Gemini Zero-Shot fits</div>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                In-context calendar reasoning estimates smooth conditional median demand without historical training,
                making it ideal for cold-start SKUs and qualitative disruption sensing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section
        id="plans"
        className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
          <div className="max-w-xl space-y-1.5">
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">Deployment plans</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Start with academic CSV evaluation or run full multi-warehouse POS and replenishment workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[8px] p-6 flex flex-col justify-between space-y-6 border ${
                  plan.highlight
                    ? "bg-[#F7F6F2] dark:bg-[#111318] border-[#0F766E] dark:border-[#14B8A6]"
                    : "bg-[#F7F6F2]/50 dark:bg-[#111318]/60 border-[#E5E3DC] dark:border-[#262A34]"
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-white">{plan.name}</div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-bold tabular-nums text-zinc-950 dark:text-white">{plan.price}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{plan.period}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{plan.desc}</p>
                  <ul className="space-y-2 pt-2 border-t border-[#E5E3DC] dark:border-[#262A34]">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-2.5 rounded-[6px] text-xs font-semibold transition cursor-pointer ${
                    plan.highlight
                      ? "bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950"
                      : "bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500"
                  }`}
                >
                  {user
                    ? saasState?.plan_tier === plan.planKey
                      ? "Current Plan — Open Workspace"
                      : `Switch to ${plan.name}`
                    : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connected Stack & Modules Grid */}
      <section className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6]">
              Connected stack
            </div>
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
              From raw CSV ledgers to multi-warehouse POS execution
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Every forecasting engine, warehouse workflow, and checkout terminal works together in one unified workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_STACK.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.name}
                  type="button"
                  onClick={() => onNavigate(mod.route)}
                  className="text-left rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] p-4 flex items-center justify-between gap-3 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[6px] bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] dark:text-[#14B8A6] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-white truncate">{mod.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{mod.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] shrink-0 transition" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Inventory Planner: 3x2 Quantified Metrics Grid */}
      <section className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6]">
                Why Inventory Planner
              </div>
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
                Empirical accuracy you can audit before you order
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setRoiModalOpen(true)}
              className="px-4 py-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318] hover:border-[#0F766E] dark:hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              <span>Estimate your ROI</span>
            </button>
          </div>

          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {IMPACT_METRICS.map((m) => (
                <div
                  key={m.label}
                  className="rounded-[8px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2]/70 dark:bg-[#111318] p-6 space-y-2 hover:-translate-y-0.5 hover:border-[#0F766E]/60 dark:hover:border-[#14B8A6]/60 transition-all duration-200"
                >
                  <div className="text-3xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6]">
                    {m.value}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{m.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="border-t border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <Reveal>
            <div className="rounded-[10px] border border-[#E5E3DC] dark:border-[#262A34] bg-white dark:bg-[#181B22] px-6 py-10 sm:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white">
                  Discover Inventory Planner
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Upload your company sales CSV to generate 28-day demand forecasts and Digital Twin replenishment plans.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => onNavigate("upload")}
                  className="px-4 py-2.5 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318] text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Upload Sales CSV
                </button>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="px-5 py-2.5 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Open workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E5E3DC] dark:border-[#262A34] bg-[#F7F6F2] dark:bg-[#111318]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-xs">
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Features
              </div>
              <div className="flex flex-col gap-2 items-start text-zinc-600 dark:text-zinc-400">
                <button onClick={() => jumpToShot(0)} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Demand Forecasting
                </button>
                <button onClick={() => jumpToShot(1)} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Replenishment Orders
                </button>
                <button onClick={() => jumpToShot(2)} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Low-Stock Alerts
                </button>
                <button onClick={() => jumpToShot(3)} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Sales Velocity
                </button>
                <button onClick={() => onNavigate("pos")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  POS Terminal
                </button>
                <button onClick={() => onNavigate("policy")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Policy Simulator
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Platform
              </div>
              <div className="flex flex-col gap-2 items-start text-zinc-600 dark:text-zinc-400">
                <button onClick={() => onNavigate("upload")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  CSV Ledger Upload
                </button>
                <button onClick={() => onNavigate("report")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Inventory Report
                </button>
                <button onClick={() => onNavigate("products")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Catalog &amp; Stock
                </button>
                <button onClick={() => onNavigate("manage-stock")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Multi-Warehouse
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Resources
              </div>
              <div className="flex flex-col gap-2 items-start text-zinc-600 dark:text-zinc-400">
                <button onClick={() => scrollTo("architecture")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Architecture
                </button>
                <button onClick={() => scrollTo("benchmarks")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  4-Model Benchmarks
                </button>
                <button onClick={() => setRoiModalOpen(true)} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  ROI Estimator
                </button>
                <button onClick={() => onNavigate("upload")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Upload Sales CSV
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Company
              </div>
              <div className="flex flex-col gap-2 items-start text-zinc-600 dark:text-zinc-400">
                <button onClick={() => onNavigate("coming:API & Webhooks")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  API &amp; Webhooks
                </button>
                <button onClick={() => onNavigate("coming:ERP Integrations")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  ERP Integrations
                </button>
                <button onClick={() => onNavigate("coming:Privacy & Terms")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Privacy &amp; Terms
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Account
              </div>
              <div className="flex flex-col gap-2 items-start text-zinc-600 dark:text-zinc-400">
                <button onClick={() => scrollTo("plans")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Pricing
                </button>
                <button onClick={() => handleLandingAction("signin")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Sign in
                </button>
                <button onClick={() => handleLandingAction("register")} className="hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer">
                  Create Account
                </button>
                <button onClick={() => onNavigate("dashboard")} className="font-semibold text-[#0F766E] dark:text-[#14B8A6] hover:underline transition cursor-pointer">
                  Open Workspace →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-6 border-t border-[#E5E3DC] dark:border-[#262A34] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <BrandMark className="w-6 h-6" />
              <div className="text-left leading-tight">
                <div className="font-bold text-sm text-zinc-950 dark:text-white">Inventory Planner</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">AI Inventory Twin</div>
              </div>
            </button>

            <div className="text-zinc-500 dark:text-zinc-400">
              Inventory Planner &copy; {new Date().getFullYear()} All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>
      {/* Lightbox Modal for Full-Resolution Screenshot Inspection */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-w-6xl w-full bg-[#181B22] border border-[#262A34] rounded-[10px] overflow-hidden shadow-2xl animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 sm:px-4 py-3 bg-[#1F232D] border-b border-[#262A34] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-white truncate">{activeShot.label}</span>
                <span className="hidden sm:inline text-xs text-zinc-400 truncate">— {activeShot.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={prevShot}
                  aria-label="Previous screenshot"
                  className="p-1.5 rounded bg-[#111318] border border-[#262A34] text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextShot}
                  aria-label="Next screenshot"
                  className="p-1.5 rounded bg-[#111318] border border-[#262A34] text-zinc-300 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxOpen(false);
                    onNavigate(activeShot.route);
                  }}
                  className="px-3 py-1.5 rounded bg-[#14B8A6] text-zinc-950 text-xs font-semibold hover:bg-[#0D9488] transition cursor-pointer"
                >
                  Open live view
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close preview"
                  className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={activeShot.image}
              alt={`${activeShot.label} — ${activeShot.title}`}
              className="w-full h-auto max-h-[82vh] object-contain bg-[#111318]"
            />
          </div>
        </div>
      )}

      {/* Blurred-Background Sign In / Register Modal */}

      {/* Interactive ROI Calculator Popup Modal */}
      {roiModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRoiModalOpen(false)}
        >
          <div
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] rounded-[10px] shadow-2xl p-5 sm:p-6 space-y-5 animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6]">
                  ROI Estimator
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white mt-0.5">
                  Estimate your annual inventory savings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRoiModalOpen(false)}
                aria-label="Close ROI calculator"
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1.5">
                  <span className="text-zinc-700 dark:text-zinc-300">Monthly retail revenue</span>
                  <span className="font-mono font-bold text-zinc-950 dark:text-white">
                    ${roiRevenue.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={20000}
                  max={1000000}
                  step={10000}
                  value={roiRevenue}
                  onChange={(e) => setRoiRevenue(Number(e.target.value))}
                  className="w-full accent-[#0F766E] dark:accent-[#14B8A6] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1.5">
                  <span className="text-zinc-700 dark:text-zinc-300">Active SKUs managed</span>
                  <span className="font-mono font-bold text-zinc-950 dark:text-white">
                    {roiSkus.toLocaleString()} SKUs
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={roiSkus}
                  onChange={(e) => setRoiSkus(Number(e.target.value))}
                  className="w-full accent-[#0F766E] dark:accent-[#14B8A6] cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Est. working capital freed / yr</div>
                <div className="text-2xl font-bold tabular-nums text-[#0F766E] dark:text-[#14B8A6] mt-1">
                  ${estimatedCashFreed.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-[8px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34]">
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Planning time saved / week</div>
                <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-1">
                  {estimatedHoursSaved} hrs
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRoiModalOpen(false);
                  onNavigate("upload");
                }}
                className="px-4 py-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-semibold hover:border-zinc-400 cursor-pointer"
              >
                Upload CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoiModalOpen(false);
                  onNavigate("dashboard");
                }}
                className="px-4 py-2 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Open workspace →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Detail Popup Modal */}
      {activeResource && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveResource(null)}
        >
          <div
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] rounded-[10px] shadow-2xl p-5 sm:p-6 space-y-5 animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#14B8A6]">
                  {activeResource.category}
                </div>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white mt-0.5">
                  {activeResource.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{activeResource.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveResource(null)}
                aria-label="Close resource"
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2.5 pt-3 border-t border-[#E5E3DC] dark:border-[#262A34]">
              {activeResource.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <Check className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-[#E5E3DC] dark:border-[#262A34] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveResource(null)}
                className="px-3.5 py-2 rounded-[6px] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-medium hover:border-zinc-400 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = activeResource;
                  setActiveResource(null);
                  if (res.route) onNavigate(res.route);
                  else if (res.scrollTarget) scrollTo(res.scrollTarget);
                  else onNavigate("upload");
                }}
                className="px-4 py-2 rounded-[6px] bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{activeResource.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blurred-Background Sign In / Register Modal */}
      {authScreen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={closeAuthModal}
          role="dialog"
          aria-modal="true"
          aria-label="Account Authentication"
        >
          <div
            className="w-full max-w-md relative animate-modal-pop my-auto py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={closeAuthModal}
                aria-label="Close authentication modal"
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AuthCard
              screen={authScreen}
              setScreen={setAuthScreen}
              email={authEmail}
              setEmail={setAuthEmail}
              user={user}
              onAuthSuccess={(authData) => {
                setAuthScreen(null);
                if (onAuthSuccess) onAuthSuccess(authData);
                else onNavigate("dashboard");
              }}
              onNavigate={(target) => {
                setAuthScreen(null);
                onNavigate(target);
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Quick-Action Bar (appears after scrolling) */}
      {scrolledDown && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 animate-fade-slide-up">
          <button
            type="button"
            onClick={() => setRoiModalOpen(true)}
            className="px-3.5 py-2.5 rounded-full bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] shadow-lg text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-[#0F766E] dark:hover:border-[#14B8A6] inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span className="hidden sm:inline">ROI</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("upload")}
            className="px-4 py-2.5 rounded-full bg-[#0F766E] hover:bg-[#115E59] dark:bg-[#14B8A6] dark:hover:bg-[#0D9488] text-white dark:text-zinc-950 shadow-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Open Workspace</span>
          </button>
        </div>
      )}
    </div>
  );
}

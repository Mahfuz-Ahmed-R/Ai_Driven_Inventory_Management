import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  Tags,
  Layers,
  UploadCloud,
  Boxes,
  SlidersHorizontal,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  Truck,
  Users,
  Scale,
  ChevronLeft,
  ChevronRight,
  X,
  Gift,
  ChevronDown,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UsageQuotaWidget } from "./ui/TierComponents";
import BrandMark from "./BrandMark";

const NAV_GROUPS = [
  {
    title: "Overview & Forecasting",
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "sales-forecast", label: "Sales Forecast", icon: TrendingUp },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Inventory & Supply",
    items: [
      { id: "products", label: "Products", icon: Package },
      { id: "inventory", label: "Inventory", icon: Boxes },
      { id: "replenishment", label: "Replenishment", icon: ShoppingCart },
    ],
  },
  {
    title: "Workspace",
    items: [
      { id: "upload", label: "Data Management", icon: UploadCloud },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Advanced & Reports",
    items: [
      { id: "policy", label: "Policy Benchmark", icon: Scale },
      { id: "report", label: "Inventory Report", icon: FileSpreadsheet },
      { id: "referrals", label: "Referrals", icon: Gift },
    ],
  },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed, mobileOpen = false, setMobileOpen, isSignedIn = false }) {
  const handleLogoClick = () => {
    if (isSignedIn) {
      window.location.hash = "#/dashboard";
    }
    window.location.reload();
  };
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dreams_sidebar_groups") || "null");
      if (saved && typeof saved === "object") return saved;
    } catch {
      // ignore
    }
    return { Main: true, Inventory: true, Stock: true, Reports: true, Peoples: true, Affiliate: true };
  });

  useEffect(() => {
    localStorage.setItem("dreams_sidebar_groups", JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeTab));
    if (activeGroup && openGroups[activeGroup.title] === false) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.title]: true }));
    }
  }, [activeTab]);

  const toggleGroup = (title) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !(prev[title] ?? true) }));
  };

  // On mobile (< md): full drawer when mobileOpen, hidden otherwise.
  // On tablet (md..lg): always icon-only rail (w-[74px]).
  // On desktop (lg+): respects `collapsed` (w-[74px] vs w-[250px]).
  const labelVisibility = mobileOpen
    ? "block"
    : collapsed
    ? "hidden"
    : "md:hidden lg:block";

  const flexLabelVisibility = mobileOpen
    ? "flex"
    : collapsed
    ? "hidden"
    : "md:hidden lg:flex";

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 md:z-30 bg-white dark:bg-[#181B22] border-r border-[#E5E3DC] dark:border-[#262A34] transition-all duration-200 flex flex-col ${
          mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0 md:w-[74px]"
        } ${collapsed ? "lg:w-[74px]" : "lg:w-[250px]"}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E3DC] dark:border-[#262A34] relative shrink-0">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 overflow-hidden text-left cursor-pointer hover:opacity-90 transition"
            title={isSignedIn ? "Refresh & go to Dashboard" : "Refresh workspace"}
          >
            <BrandMark />
            <div className={`leading-tight ${labelVisibility}`}>
              <div className="font-bold text-[15px] text-zinc-900 dark:text-white truncate">Inventory Planner</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">AI Inventory Twin</div>
            </div>
          </button>

          <button
            onClick={() => setMobileOpen?.(false)}
            aria-label="Close navigation"
            className="md:hidden p-1.5 rounded-[6px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="hidden lg:flex absolute -right-3 top-5 w-6 h-6 rounded-full bg-white dark:bg-[#181B22] text-zinc-600 dark:text-zinc-300 border border-[#E5E3DC] dark:border-[#262A34] items-center justify-center shadow-xs hover:border-[#0F766E] dark:hover:border-[#14B8A6] hover:text-[#0F766E] dark:hover:text-[#14B8A6] transition cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-4">
          {NAV_GROUPS.map((group) => {
            const isOpen = collapsed && !mobileOpen ? true : (openGroups[group.title] ?? true);
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`w-full px-3 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer ${flexLabelVisibility}`}
                >
                  <span>{group.title}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`group w-full flex items-center ${
                            mobileOpen
                              ? "gap-3 px-3"
                              : collapsed
                              ? "justify-center px-2"
                              : "md:justify-center md:px-2 lg:justify-start lg:gap-3 lg:px-3"
                          } py-2 rounded-[6px] text-[13px] transition cursor-pointer ${
                            active
                              ? "bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6] font-semibold"
                              : "font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                          title={item.label}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active
                                ? "text-[#0F766E] dark:text-[#14B8A6]"
                                : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                            }`}
                          />
                          <span className={`flex-1 items-center justify-between gap-2 truncate ${flexLabelVisibility}`}>
                            <span className="truncate">{item.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={`p-3 border-t border-[#E5E3DC] dark:border-[#262A34] shrink-0 ${labelVisibility}`}>
          <UsageQuotaWidget />
        </div>
      </aside>
    </>
  );
}

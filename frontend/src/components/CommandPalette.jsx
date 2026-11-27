import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  LayoutDashboard,
  Package,
  UploadCloud,
  FileSpreadsheet,
  Gift,
  Crown,
  Moon,
  Sun,
  Keyboard,
  Sparkles,
  CornerDownLeft,
  X,
} from "lucide-react";

const PAGE_COMMANDS = [
  { id: "nav:dashboard", label: "Go to Dashboard", group: "Navigation", tab: "dashboard", icon: LayoutDashboard },
  { id: "nav:sales-dashboard", label: "Go to Sales Dashboard", group: "Navigation", tab: "sales-dashboard", icon: LayoutDashboard },
  { id: "nav:products", label: "Go to Products", group: "Navigation", tab: "products", icon: Package },
  { id: "nav:low-stocks", label: "View Low Stocks", group: "Navigation", tab: "low-stocks", icon: Package },
  { id: "nav:upload", label: "Upload Sales CSV", group: "Navigation", tab: "upload", icon: UploadCloud },
  { id: "nav:report", label: "Inventory & Replenishment Report", group: "Navigation", tab: "report", icon: FileSpreadsheet },
  { id: "nav:policy", label: "Purchase & Policy Benchmark", group: "Navigation", tab: "policy", icon: FileSpreadsheet },
  { id: "nav:suppliers", label: "Suppliers", group: "Navigation", tab: "suppliers", icon: Package },
  { id: "nav:referrals", label: "Referral & Affiliate Program", group: "Navigation", tab: "referrals", icon: Gift },
];

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  darkMode,
  setDarkMode,
  onOpenUpgrade,
  onOpenShortcuts,
  onOpenOnboarding,
  skus = [],
  onSelectSku,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands = useMemo(() => {
    const actions = [
      {
        id: "act:theme",
        label: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        group: "Quick Actions",
        icon: darkMode ? Sun : Moon,
        run: () => setDarkMode?.(!darkMode),
      },
      { id: "act:upgrade", label: "Manage Subscription & Plan Tiers", group: "Quick Actions", icon: Crown, run: () => onOpenUpgrade?.() },
      { id: "act:onboarding", label: "Open Workspace Onboarding Wizard", group: "Quick Actions", icon: Sparkles, run: () => onOpenOnboarding?.() },
      { id: "act:shortcuts", label: "View Keyboard Shortcuts", group: "Quick Actions", icon: Keyboard, run: () => onOpenShortcuts?.() },
    ];

    const q = query.trim().toLowerCase();
    const base = [...actions, ...PAGE_COMMANDS.map((p) => ({ ...p, run: () => onNavigate?.(p.tab) }))];

    const skuMatches = q
      ? skus
          .filter((s) => s.sku?.toLowerCase().includes(q) || s.product_name?.toLowerCase().includes(q))
          .slice(0, 6)
          .map((s) => ({
            id: `sku:${s.sku}`,
            label: `${s.sku} — ${s.product_name}`,
            sublabel: `Stock: ${s.current_stock ?? 0} • ${s.category || "General"}`,
            group: "SKUs & Products",
            icon: Package,
            run: () => {
              onSelectSku?.(s.sku);
              onNavigate?.("products");
            },
          }))
      : [];

    const filteredBase = q
      ? base.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
      : base;

    return [...filteredBase, ...skuMatches];
  }, [query, darkMode, setDarkMode, onOpenUpgrade, onOpenOnboarding, onOpenShortcuts, onNavigate, skus, onSelectSku]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (commands.length ? (i + 1) % commands.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (commands.length ? (i - 1 + commands.length) % commands.length : 0));
    } else if (e.key === "Enter" && commands[activeIndex]) {
      e.preventDefault();
      commands[activeIndex].run();
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[12vh] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 rounded-[12px] shadow-2xl overflow-hidden animate-modal-pop"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-200 dark:border-slate-700/70">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, or SKU..."
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
          {commands.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500 dark:text-slate-400">
              No matching commands or SKUs for "{query}".
            </div>
          ) : (
            commands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const active = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    cmd.run();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-[8px] text-left text-xs transition cursor-pointer ${
                    active
                      ? "bg-[#0F766E] text-zinc-950 font-bold"
                      : "text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-zinc-950" : "text-zinc-400"}`} />
                    <div className="min-w-0">
                      <div className="truncate">{cmd.label}</div>
                      {cmd.sublabel && (
                        <div className={`text-[10px] truncate ${active ? "text-zinc-800" : "text-zinc-400"}`}>
                          {cmd.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        active ? "bg-black/10 text-zinc-950" : "bg-zinc-100 dark:bg-slate-800 text-zinc-400"
                      }`}
                    >
                      {cmd.group}
                    </span>
                    {active && <CornerDownLeft className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-zinc-200 dark:border-slate-700/70 bg-zinc-50 dark:bg-[#161922] flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400">
          <span>↑↓ to navigate • Enter to select • Esc to close</span>
          <span className="font-mono">Ctrl/⌘ + K</span>
        </div>
      </div>
    </div>
  );
}

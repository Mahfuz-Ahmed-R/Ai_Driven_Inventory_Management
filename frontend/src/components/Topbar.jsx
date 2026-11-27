import { useState } from "react";
import {
  Search,
  Bell,
  Building2,
  Moon,
  Sun,
  User,
  Globe,
  Lock,
  LogOut,
  Menu,
  X,
  Keyboard,
  SlidersHorizontal,
  Gift,
} from "lucide-react";
import { useSaas } from "../context/SaasContext";
import { TierBadge } from "./ui/TierComponents";

export default function Topbar({
  activeJob,
  user,
  onLogout,
  searchQuery,
  setSearchQuery,
  darkMode,
  setDarkMode,
  onNavigate,
  onOpenMobileMenu,
  onOpenPalette,
  onOpenShortcuts,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { saasState, openUpgradeModal, setOnboardingOpen } = useSaas();
  const criticalCount = activeJob?.summary_kpis?.critical_count || 0;

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#181B22] border-b border-[#E5E3DC] dark:border-[#262A34]">
      <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu + Search bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative w-full max-w-xs hidden sm:block">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU or product..."
              className="w-full pl-9 pr-12 py-2 text-sm bg-[#F7F6F2] dark:bg-[#111318] text-zinc-900 dark:text-white border border-[#E5E3DC] dark:border-[#262A34] rounded-[6px] focus:outline-none focus:border-[#0F766E] dark:focus:border-[#14B8A6]"
            />
            <button
              type="button"
              onClick={onOpenPalette}
              title="Open Command Palette (Ctrl+K)"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] px-1.5 py-0.5 rounded cursor-pointer"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            title={saasState?.onboarding?.completed ? "Edit workspace setup & personalization" : "Complete workspace setup"}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/25 dark:border-[#14B8A6]/30 text-xs font-semibold hover:bg-[#0F766E]/15 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="max-w-[120px] truncate">
              {saasState?.onboarding?.completed
                ? saasState?.onboarding?.data?.company_name || "Setup"
                : "Setup"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openUpgradeModal("Manage your DreamsAI subscription tier.")}
            title="Current Subscription Plan"
            className="hidden sm:inline-flex items-center cursor-pointer"
          >
            <TierBadge tier={saasState?.plan_tier} />
          </button>

          {activeJob && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-xs font-medium text-zinc-900 dark:text-zinc-100">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              <span className="max-w-[160px] truncate">{activeJob.company_name}</span>
            </div>
          )}

          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            className="sm:hidden p-2 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] transition cursor-pointer"
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard Shortcuts (Shift + ?)"
            className="hidden md:flex p-2 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onNavigate?.("low-stocks")}
            title="View Low Stock Alerts"
            className="relative p-2 rounded-[6px] bg-[#F7F6F2] dark:bg-[#111318] border border-[#E5E3DC] dark:border-[#262A34] text-zinc-700 dark:text-zinc-200 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {criticalCount}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              className="p-2 rounded-[6px] bg-zinc-900 dark:bg-zinc-800 border border-transparent dark:border-[#262A34] text-white hover:bg-[#0F766E] dark:hover:bg-[#14B8A6] dark:hover:text-zinc-950 transition cursor-pointer"
            >
              <User className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                onMouseLeave={() => setMenuOpen(false)}
                className="absolute right-0 mt-2 w-56 rounded-[8px] bg-white dark:bg-[#181B22] border border-[#E5E3DC] dark:border-[#262A34] shadow-lg py-1.5 z-50 text-xs animate-modal-pop"
              >
                <div className="px-3.5 py-2 border-b border-[#E5E3DC] dark:border-[#262A34]">
                  <div className="font-semibold text-zinc-900 dark:text-white truncate">{user ? user.name : "Guest User"}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{user ? user.email : "Not signed in"}</div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate?.("referrals");
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" /> Referrals & Affiliates
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate?.("landing");
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" /> Landing Page
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate?.("lock");
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-500" /> Lock Screen
                </button>
                <div className="my-1 border-t border-[#E5E3DC] dark:border-[#262A34]" />
                {user ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.("signin");
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-[#0F766E] dark:text-[#14B8A6] hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign In
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="sm:hidden px-3 pb-3 pt-1 border-t border-[#E5E3DC] dark:border-[#262A34]">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU or product..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F6F2] dark:bg-[#111318] text-zinc-900 dark:text-white border border-[#E5E3DC] dark:border-[#262A34] rounded-[6px] focus:outline-none focus:border-[#0F766E] dark:focus:border-[#14B8A6]"
            />
          </div>
        </div>
      )}
    </header>
  );
}

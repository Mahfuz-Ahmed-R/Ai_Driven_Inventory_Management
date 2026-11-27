import React, { useState } from "react";
import {
  Clock,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  Bell,
  CheckCircle2,
  Sparkles,
  ServerCrash,
  Package,
  UploadCloud,
  Copy,
} from "lucide-react";
import { logClientError } from "../utils/apiClient";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[12px] border border-zinc-200 dark:border-slate-700/70 shadow-sm";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logClientError("ErrorBoundary", error, { componentStack: info?.componentStack?.slice(0, 400) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false, error: null })}
          onNavigate={(tab) => {
            this.setState({ hasError: false, error: null });
            this.props.onNavigate?.(tab);
          }}
        />
      );
    }
    return this.props.children;
  }
}

export function ComingSoonPage({ featureName, onNavigate }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNotify = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className={`${CARD} max-w-lg w-full p-5 sm:p-8 text-center space-y-6`}>
        <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/15 text-[#0F766E] flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F766E]/15 text-[#0F766E] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> In Active Development
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            {featureName ? `${featureName} — Coming Soon` : "Coming Soon"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">
            We are actively building {featureName || "this module"} for the DreamsAI Inventory Twin platform.
            Leave your email to get notified when it launches.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            ["14", "Days"],
            ["08", "Hrs"],
            ["42", "Min"],
            ["19", "Sec"],
          ].map(([val, label]) => (
            <div
              key={label}
              className="p-3 rounded-[10px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700/70"
            >
              <div className="text-xl font-extrabold text-[#0F766E]">{val}</div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        {subscribed ? (
          <div className="p-3 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            You're on the list! We'll notify {email} at launch.
          </div>
        ) : (
          <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for early access..."
              className="flex-1 px-3.5 py-2.5 text-sm rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Bell className="w-3.5 h-3.5" /> Notify Me
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-zinc-200 dark:border-slate-700/70">
          <button
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold hover:border-[#0F766E] transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}

export function MaintenancePage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className={`${CARD} max-w-md w-full p-5 sm:p-8 text-center space-y-5`}>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
          <Wrench className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
            We are Under Maintenance
          </h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">
            Scheduled upgrades to our LightGBM & Digital Twin compute cluster are underway. We will be back shortly.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold hover:bg-[#115E59] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorPage({ code = "404", brokenPath, message, onNavigate, onRetry }) {
  const is500 = String(code) === "500";
  const Icon = is500 ? ServerCrash : AlertTriangle;
  const [copied, setCopied] = useState(false);

  const handleCopyError = () => {
    navigator.clipboard?.writeText(`DreamsAI Error ${code}: ${message || brokenPath || "Unknown"}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className={`${CARD} max-w-lg w-full p-6 sm:p-8 text-center space-y-5`}>
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-[8px] bg-zinc-900 dark:bg-white flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0F766E] dark:text-zinc-900" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white">
            Dreams<span className="text-[#0F766E]">AI</span> Inventory Twin
          </span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
          <Icon className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-widest text-red-500">
            Error {code}
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
            {is500 ? "Something Went Wrong" : "Page Not Found"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">
            {is500
              ? message || "An unexpected error occurred while rendering this view. Your saved drafts are preserved."
              : "The route you requested doesn't exist or may have been moved. Jump back into your workspace below."}
          </p>
          {brokenPath && !is500 && (
            <div className="mt-2 px-3 py-1.5 rounded-[6px] bg-zinc-100 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 font-mono text-xs text-zinc-600 dark:text-slate-300 inline-block">
              Route: {brokenPath}
            </div>
          )}
        </div>

        {!is500 && (
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              onClick={() => onNavigate("products")}
              className="p-2.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 hover:border-[#0F766E] transition flex items-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#0E9384]" /> Products Catalog
            </button>
            <button
              onClick={() => onNavigate("upload")}
              className="p-2.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 hover:border-[#0F766E] transition flex items-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-[#0F766E]" /> Upload Sales CSV
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {is500 && (
            <>
              <button
                onClick={() => (onRetry ? onRetry() : window.location.reload())}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry View
              </button>
              <button
                onClick={handleCopyError}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy Debug Info"}
              </button>
            </>
          )}
          <button
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-zinc-950 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold hover:border-[#0F766E] transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}

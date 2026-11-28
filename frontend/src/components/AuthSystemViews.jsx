import { useState, useEffect, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import { RECHARTS_TOOLTIP_PROPS } from "../utils/chartTheme";
import {
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Trash2,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Eye,
  EyeOff,
  User as UserIcon,
  Loader2,
  KeyRound,
  Check,
  AlertCircle,
} from "lucide-react";
import { ComingSoonPage, MaintenancePage, ErrorPage } from "./SystemPages";
import { erpRequest } from "../hooks/useErpData";
import { authFetch } from "../hooks/useAuth";
import { AnimatedNumber } from "./ui/AnimatedNumber";

const CARD = "bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70";
const TH = "py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400";
const INPUT = "w-full px-3.5 py-2 text-base sm:text-sm rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]";

const WEEKLY_COMPANIES = [
  { day: "M", count: 42 },
  { day: "T", count: 68 },
  { day: "W", count: 55 },
  { day: "T", count: 80 },
  { day: "F", count: 94 },
  { day: "S", count: 72 },
  { day: "S", count: 60 },
];

const MONTHLY_REVENUE = [
  { month: "Jan", rev: 28000 },
  { month: "Feb", rev: 34000 },
  { month: "Mar", rev: 31000 },
  { month: "Apr", rev: 42000 },
  { month: "May", rev: 45787 },
  { month: "Jun", rev: 52400 },
];

export function SalesDashboardView({ job, erpData, darkMode }) {
  const skus = job?.skus?.length ? job.skus : erpData?.products || [];
  const bestSellers = [...skus].sort((a, b) => (b.total_28d_demand || 0) - (a.total_28d_demand || 0)).slice(0, 5);
  const recentOrders = (erpData?.pos_orders || []).map((o, idx) => ({
    id: idx + 1,
    name: o.items?.[0]?.product_name || o.customer_name,
    time: new Date(o.created_at).toLocaleDateString(),
    payment: o.payment_method,
    ref: o.tx_id,
    amount: Number(o.grand_total || 0),
    status: o.status,
  }));

  if (skus.length === 0 && recentOrders.length === 0) {
    return (
      <div className={`${CARD} p-8 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
        No sales data yet. Upload a CSV to generate your Sales Dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Sales Dashboard</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Predicted unit velocity, recent transactions, and best sellers across <AnimatedNumber value={skus.length} /> SKUs
        </p>
      </div>

      <div className={`${CARD} p-5`}>
        <h2 className="text-sm font-bold text-zinc-950 dark:text-white mb-4">Top 10 SKUs — 28-Day Predicted Demand</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...skus].sort((a, b) => (b.total_28d_demand || 0) - (a.total_28d_demand || 0)).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
              <XAxis dataKey="sku" tick={{ fontSize: 10, fill: "#71717A" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
              <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
              <Bar dataKey="total_28d_demand" name="28D Forecast (Units)" fill="#FE9F43" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-7 ${CARD} overflow-hidden`}>
          <div className="p-4 border-b border-zinc-200 dark:border-slate-700/70">
            <h2 className="text-sm font-bold">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className={TH}>#</th>
                  <th className={TH}>Order Details</th>
                  <th className={TH}>Payment</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentOrders.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 px-4 font-bold">{tx.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{tx.name}</div>
                      <div className="text-[10px] text-zinc-500">{tx.time}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{tx.payment}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{tx.ref}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-bold ${tx.status === "Completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">${tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`lg:col-span-5 ${CARD} p-5 space-y-3`}>
          <h2 className="text-sm font-bold">Best Sellers</h2>
          <div className="divide-y divide-zinc-100 dark:divide-slate-700/60">
            {bestSellers.map((s) => (
              <div key={s.sku} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold">{s.product_name}</div>
                  <div className="text-[11px] text-zinc-500">{s.sku} • {s.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#0F766E]"><AnimatedNumber value={s.total_28d_demand || 0} suffix=" units" /></div>
                  <div className="text-[11px] text-emerald-500"><AnimatedNumber value={(s.total_28d_demand || 0) * (s.price || 0)} prefix="$" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SuperAdminView({ jobs, loadJobDetail, handleDeleteJob, onNavigate, darkMode }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[10px] bg-gradient-to-r from-[#1B1F29] to-[#262C3B] text-white p-6 flex flex-wrap items-center justify-between gap-4 border border-slate-700/70">
        <div>
          <h1 className="text-xl font-bold">Welcome Back, Adrian (Super Admin)</h1>
          <p className="text-xs text-slate-300 mt-1">14 New Companies Subscribed Today • 200+ Active Forecasting Jobs</p>
        </div>
        <button onClick={() => onNavigate("upload")} className="px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer">
          + New Company Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Companies", val: 5468, prefix: "", decimals: 0, Icon: Building2, cls: "text-[#0F766E]" },
          { label: "Active Companies", val: 4598, prefix: "", decimals: 0, Icon: CheckCircle2, cls: "text-emerald-500" },
          { label: "Total Subscribers", val: 3698, prefix: "", decimals: 0, Icon: Users, cls: "text-blue-400" },
          { label: "Total Earnings", val: 89878.58, prefix: "$", decimals: 2, Icon: DollarSign, cls: "text-[#0E9384]" },
        ].map((k) => (
          <div key={k.label} className={`${CARD} p-5 flex items-center justify-between`}>
            <div>
              <div className="text-xs text-zinc-500">{k.label}</div>
              <div className="text-xl font-extrabold mt-1">
                <AnimatedNumber value={k.val} prefix={k.prefix} decimals={k.decimals} />
              </div>
            </div>
            <k.Icon className={`w-7 h-7 ${k.cls}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`lg:col-span-5 ${CARD} p-5`}>
          <h2 className="text-sm font-bold mb-1">Companies (This Week)</h2>
          <p className="text-xs text-emerald-500 font-semibold mb-3">+5 Companies from last month</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_COMPANIES}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Bar dataKey="count" name="Companies" fill="#FE9F43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`lg:col-span-7 ${CARD} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold">Platform Revenue (2025)</h2>
              <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> $45,787 (+40% from last year)</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272A" : "#E4E4E7"} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                <Tooltip {...RECHARTS_TOOLTIP_PROPS} />
                <Area type="monotone" dataKey="rev" name="Revenue ($)" stroke="#0E9384" fill="#0E9384" fillOpacity={0.22} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Saved Analysis History */}
      <div className={`${CARD} p-6 space-y-4`}>
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Saved Company Analysis Jobs</h2>
        <div className="divide-y divide-zinc-100 dark:divide-slate-700/60">
          {jobs.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-slate-400 py-4">No analyses saved yet. Upload a CSV to generate your first forecast.</p>
          )}
          {jobs.map((j) => (
            <div key={j.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-zinc-900 dark:text-white">{j.company_name}</div>
                <div className="text-zinc-500 dark:text-slate-400">
                  {j.filename} • {new Date(j.created_at).toLocaleString()} • Status:{" "}
                  <span className={j.status === "completed" ? "text-emerald-500 font-semibold" : "text-amber-400 font-semibold"}>{j.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await loadJobDetail(j.id);
                    onNavigate("dashboard");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-zinc-900 dark:bg-slate-800 text-white hover:bg-[#0F766E] font-semibold transition cursor-pointer"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </button>
                <button onClick={() => handleDeleteJob(j.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 transition cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const AUTH_ONLY_SCREENS = new Set([
  "signin",
  "register",
  "forgot",
  "email-otp",
  "two-step",
  "reset",
  "success",
  "lock",
]);

const OTP_LENGTH = 6;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authRequest(url, body, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Unable to reach the server. Check your connection and try again." } };
  }
  let data = {};
  try {
    data = await res.json();
    if (!res.ok && !data.error && data.detail) {
      data.error = data.detail;
    }
  } catch {
    data = { error: res.ok ? "" : `Server error (${res.status}). Please try again.` };
  }
  return { ok: res.ok, status: res.status, data };
}

function getPasswordChecks(pw) {
  return {
    minLen: pw.length >= 8,
    hasLetter: /[A-Za-z]/.test(pw),
    hasNumber: /\d/.test(pw),
    hasBonus: /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw),
  };
}

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", barColor: "bg-zinc-200 dark:bg-slate-700", textColor: "text-zinc-500" };
  const c = getPasswordChecks(pw);
  const score = [c.minLen, c.hasLetter, c.hasNumber, c.hasBonus].filter(Boolean).length;
  if (score <= 1) return { score: 1, label: "Weak", barColor: "bg-red-500", textColor: "text-red-500" };
  if (score === 2) return { score: 2, label: "Fair", barColor: "bg-amber-500", textColor: "text-amber-500" };
  if (score === 3) return { score: 3, label: "Good", barColor: "bg-[#0F766E]", textColor: "text-[#0F766E] dark:text-[#14B8A6]" };
  return { score: 4, label: "Strong", barColor: "bg-emerald-500", textColor: "text-emerald-500" };
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1" role="alert">
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  rightAction,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-xs font-semibold text-zinc-700 dark:text-slate-200">
          {label}
        </label>
        {rightAction}
      </div>
      <div className="relative">
        <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`${INPUT} pl-9 pr-10 ${error ? "border-red-500 dark:border-red-500 focus:border-red-500" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function AuthCard({ screen, setScreen, email, setEmail, user, onAuthSuccess, onNavigate }) {
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsInfo, setShowTermsInfo] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpPurpose, setOtpPurpose] = useState("register");
  const [otpDigits, setOtpDigits] = useState([...EMPTY_OTP]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetToken, setResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [switchAccountMode, setSwitchAccountMode] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const switchScreen = (nextScreen, { preserveMessages = false } = {}) => {
    if (!preserveMessages) {
      setErrorMsg("");
      setStatusMsg("");
    }
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setOtpDigits([...EMPTY_OTP]);
    setScreen(nextScreen);
  };

  const clearFieldError = (key) => {
    if (!fieldErrors[key]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleOtpChange = (idx, val) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[idx] = clean;
    setOtpDigits(next);
    setErrorMsg("");
    if (clean && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (otpDigits[idx]) {
        const next = [...otpDigits];
        next[idx] = "";
        setOtpDigits(next);
      } else if (idx > 0) {
        const next = [...otpDigits];
        next[idx - 1] = "";
        setOtpDigits(next);
        otpRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = [...EMPTY_OTP];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    setErrorMsg("");
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
  };

  const renderTabs = () => (
    <div className="grid grid-cols-2 p-1 rounded-[8px] bg-zinc-100 dark:bg-[#141720] border border-zinc-200/80 dark:border-slate-700/70">
      {[
        { id: "signin", label: "Sign In" },
        { id: "register", label: "Create Account" },
      ].map((tab) => {
        const active = screen === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchScreen(tab.id)}
            className={`py-2 text-xs font-semibold rounded-[6px] transition cursor-pointer ${active
              ? "bg-white dark:bg-[#1E222D] text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-white"
              }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  if (user && !switchAccountMode && (screen === "signin" || screen === "register")) {
    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5 text-center`}>
        <div className="w-12 h-12 rounded-full bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">You&apos;re signed in</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Active workspace session for <span className="font-semibold text-zinc-800 dark:text-slate-200">{user.email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => (onAuthSuccess ? onAuthSuccess() : onNavigate?.("dashboard"))}
          className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer"
        >
          Continue to Workspace
        </button>
        <button
          type="button"
          onClick={() => setSwitchAccountMode(true)}
          className="text-xs text-zinc-500 hover:text-[#0F766E] font-semibold cursor-pointer"
        >
          Sign in or register a different account
        </button>
      </div>
    );
  }

  if (screen === "signin") {
    const handleSignIn = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      setStatusMsg("");
      const trimmedEmail = email.trim();
      const errs = {};
      if (!trimmedEmail) errs.email = "Email address is required.";
      else if (!EMAIL_REGEX.test(trimmedEmail) && trimmedEmail.includes("@")) errs.email = "Enter a valid email address.";
      if (!password) errs.password = "Password is required.";
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      setBusy(true);
      const { ok, data } = await authRequest("/api/auth/login/", {
        email: trimmedEmail,
        password,
        remember_me: rememberMe,
      });
      setBusy(false);

      if (!ok) {
        if (data.requires_otp) {
          setOtpPurpose(data.purpose || "register");
          setResendCooldown(data.cooldown_seconds || 30);
          setStatusMsg(data.error || "Please verify your email to continue.");
          switchScreen("email-otp", { preserveMessages: true });
          return;
        }
        setErrorMsg(data.error || "Sign in failed. Please check your credentials.");
        return;
      }

      if (data.requires_otp) {
        setOtpPurpose(data.purpose || "two_step");
        setResendCooldown(data.cooldown_seconds || 30);
        setStatusMsg(data.message || "Enter the verification code sent to your email.");
        switchScreen("two-step", { preserveMessages: true });
        return;
      }

      setStatusMsg(`Signed in as ${data.user?.email || trimmedEmail}`);
      if (onAuthSuccess) onAuthSuccess(data);
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        {renderTabs()}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Welcome back</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Sign in to access your workspace.
          </p>
        </div>

        <form onSubmit={handleSignIn} noValidate className="space-y-4">
          <div>
            <label htmlFor="auth-signin-email" className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-signin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="name@company.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                className={`${INPUT} pl-9 ${fieldErrors.email ? "border-red-500 dark:border-red-500" : ""}`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          <PasswordInput
            id="auth-signin-password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            error={fieldErrors.password}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-2 text-zinc-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#0F766E] rounded"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => switchScreen("forgot")}
              className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500 flex items-start gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {statusMsg && (
            <div className="p-2.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Signing In..." : "Sign In to Workspace"}
          </button>
        </form>
      </div>
    );
  }

  if (screen === "register") {
    const pwChecks = getPasswordChecks(password);
    const strength = getPasswordStrength(password);

    const handleRegister = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      const errs = {};

      if (trimmedName.length < 2) errs.name = "Full name must be at least 2 characters.";
      if (!trimmedEmail) errs.email = "Work email is required.";
      else if (!EMAIL_REGEX.test(trimmedEmail)) errs.email = "Enter a valid email address.";

      if (!password) errs.password = "Password is required.";
      else if (!pwChecks.minLen || !pwChecks.hasLetter || !pwChecks.hasNumber) {
        errs.password = "Use at least 8 characters with both a letter and a number.";
      }

      if (!confirmPassword) errs.confirmPassword = "Please confirm your password.";
      else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";

      if (!agreeTerms) errs.terms = "Please accept the Terms & Privacy Policy to continue.";

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      setBusy(true);
      const { ok, data } = await authRequest("/api/auth/register/", {
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      setBusy(false);

      if (!ok) {
        if (data.field_errors) setFieldErrors(data.field_errors);
        setErrorMsg(data.error || "Registration failed. Please review your details.");
        return;
      }

      if (data.requires_otp === false && data.access) {
        setStatusMsg(`Signed in as ${data.user?.email || trimmedEmail}`);
        if (onAuthSuccess) onAuthSuccess(data);
        return;
      }

      setOtpPurpose("register");
      setResendCooldown(data.cooldown_seconds || 30);
      setStatusMsg(data.message || `Verification code sent to ${trimmedEmail}.`);
      switchScreen("email-otp", { preserveMessages: true });
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        {renderTabs()}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Create your account</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Start with email-verified access to your inventory forecasting workspace.
          </p>
        </div>

        <form onSubmit={handleRegister} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="auth-reg-name" className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-reg-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError("name");
                }}
                placeholder="Alex Morgan"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
                className={`${INPUT} pl-9 ${fieldErrors.name ? "border-red-500 dark:border-red-500" : ""}`}
              />
            </div>
            <FieldError message={fieldErrors.name} />
          </div>

          <div>
            <label htmlFor="auth-reg-email" className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-reg-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="alex@company.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                className={`${INPUT} pl-9 ${fieldErrors.email ? "border-red-500 dark:border-red-500" : ""}`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          <div>
            <PasswordInput
              id="auth-reg-password"
              label="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 dark:text-slate-400">Password strength</span>
                  <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className={`rounded-full transition-colors ${strength.score >= lvl ? strength.barColor : "bg-zinc-200 dark:bg-slate-700"
                        }`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] pt-0.5">
                  {[
                    { ok: pwChecks.minLen, label: "8+ characters" },
                    { ok: pwChecks.hasLetter, label: "1 letter" },
                    { ok: pwChecks.hasNumber, label: "1 number" },
                  ].map((req) => (
                    <span
                      key={req.label}
                      className={`inline-flex items-center gap-1 ${req.ok ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-zinc-400"
                        }`}
                    >
                      <Check className="w-2.5 h-2.5" />
                      {req.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <PasswordInput
            id="auth-reg-confirm"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearFieldError("confirmPassword");
            }}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />

          <div>
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  clearFieldError("terms");
                }}
                className="accent-[#0F766E] mt-0.5 rounded"
              />
              <span>
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsInfo((v) => !v);
                  }}
                  className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline cursor-pointer"
                >
                  Terms &amp; Privacy Policy
                </button>
              </span>
            </label>
            <FieldError message={fieldErrors.terms} />
            {showTermsInfo && (
              <div className="mt-2 p-2.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-[11px] text-zinc-600 dark:text-slate-400 leading-relaxed">
                Your workspace data, uploaded sales CSVs, and forecasts remain isolated to your account. We use your email strictly for verification codes and security alerts.
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500 flex items-start gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    );
  }

  if (screen === "forgot") {
    const handleForgot = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
        setFieldErrors({ email: "Enter a valid email address." });
        return;
      }
      setBusy(true);
      const { ok, data } = await authRequest("/api/auth/forgot-password/", { email: trimmedEmail });
      setBusy(false);

      if (!ok) {
        if (data.retry_after) setResendCooldown(data.retry_after);
        setErrorMsg(data.error || "Unable to send reset code.");
        return;
      }
      setOtpPurpose("forgot_password");
      setResendCooldown(data.cooldown_seconds || 30);
      setStatusMsg(data.message || "Reset code sent if the account exists.");
      switchScreen("email-otp", { preserveMessages: true });
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        <button
          type="button"
          onClick={() => switchScreen("signin")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-[8px] bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Reset your password</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Enter your account email and we&apos;ll send a 6-digit verification code.
          </p>
        </div>

        <form onSubmit={handleForgot} noValidate className="space-y-4">
          <div>
            <label htmlFor="auth-forgot-email" className="block text-xs font-semibold text-zinc-700 dark:text-slate-200 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-forgot-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                placeholder="name@company.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                className={`${INPUT} pl-9 ${fieldErrors.email ? "border-red-500 dark:border-red-500" : ""}`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500" role="alert">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Sending Code..." : "Send Verification Code"}
          </button>
        </form>
      </div>
    );
  }

  if (screen === "email-otp" || screen === "two-step") {
    const activePurpose = screen === "two-step" ? "two_step" : otpPurpose;
    const codeValue = otpDigits.join("");

    const handleVerifyOtp = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      if (codeValue.length < OTP_LENGTH) {
        setErrorMsg(`Please enter the full ${OTP_LENGTH}-digit verification code.`);
        return;
      }
      setBusy(true);
      const { ok, data } = await authRequest("/api/auth/verify-otp/", {
        email: email.trim(),
        code: codeValue,
        purpose: activePurpose,
      });
      setBusy(false);

      if (!ok) {
        setErrorMsg(data.error || "Invalid or expired verification code.");
        return;
      }

      if (activePurpose === "forgot_password") {
        setResetToken(data.reset_token);
        switchScreen("reset");
      } else {
        if (onAuthSuccess) onAuthSuccess(data);
        setStatusMsg("Account verified and signed in!");
        switchScreen("success", { preserveMessages: true });
      }
    };

    const handleResend = async () => {
      if (resendCooldown > 0 || resendBusy) return;
      setErrorMsg("");
      setResendBusy(true);
      const { ok, data } = await authRequest("/api/auth/send-otp/", {
        email: email.trim(),
        purpose: activePurpose,
      });
      setResendBusy(false);

      if (!ok) {
        if (data.retry_after) setResendCooldown(data.retry_after);
        setErrorMsg(data.error || "Could not resend code.");
        return;
      }
      setResendCooldown(data.cooldown_seconds || 30);
      setOtpDigits([...EMPTY_OTP]);
      setStatusMsg("A fresh verification code has been sent.");
      otpRefs.current[0]?.focus();
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        <button
          type="button"
          onClick={() => switchScreen(activePurpose === "register" ? "register" : "signin")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Change email
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 rounded-full bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
            {screen === "two-step" ? "2-Step Verification" : "Check your email"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Enter the 6-digit code sent to <span className="font-semibold text-zinc-800 dark:text-slate-200">{email || "your email"}</span>. Code expires in 2 minutes.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
            {otpDigits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Verification digit ${i + 1}`}
                value={d}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                maxLength={1}
                className="w-10 h-11 sm:w-11 sm:h-12 text-center text-base sm:text-lg font-bold rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E] dark:focus:border-[#14B8A6] transition"
              />
            ))}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500 text-center" role="alert">
              {errorMsg}
            </div>
          )}
          {statusMsg && !errorMsg && (
            <div className="text-xs text-center font-medium text-emerald-600 dark:text-emerald-400">{statusMsg}</div>
          )}

          <button
            type="submit"
            disabled={busy || codeValue.length < OTP_LENGTH}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendBusy}
            className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-default"
          >
            {resendBusy
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "reset") {
    const pwChecks = getPasswordChecks(password);
    const strength = getPasswordStrength(password);

    const handleReset = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      const errs = {};
      if (!pwChecks.minLen || !pwChecks.hasLetter || !pwChecks.hasNumber) {
        errs.password = "Use at least 8 characters with both a letter and a number.";
      }
      if (password !== confirmPassword) {
        errs.confirmPassword = "Passwords do not match.";
      }
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      setBusy(true);
      const { ok, data } = await authRequest("/api/auth/reset-password/", {
        reset_token: resetToken,
        new_password: password,
      });
      setBusy(false);

      if (!ok) {
        setErrorMsg(data.error || "Unable to update password.");
        return;
      }
      switchScreen("success");
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Set a new password</h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Choose a strong password for your DreamsAI account.
          </p>
        </div>

        <form onSubmit={handleReset} noValidate className="space-y-3.5">
          <div>
            <PasswordInput
              id="auth-reset-password"
              label="New Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            {password && (
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Strength</span>
                <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
              </div>
            )}
          </div>

          <PasswordInput
            id="auth-reset-confirm"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearFieldError("confirmPassword");
            }}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />

          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500" role="alert">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    );
  }

  if (screen === "success") {
    const isPasswordReset = otpPurpose === "forgot_password";
    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-4 text-center`}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
          {isPasswordReset ? "Password updated!" : "All set!"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-slate-400">
          {isPasswordReset
            ? "Your password has been reset. Please sign in with your new password."
            : "Your account verification and security update succeeded."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (isPasswordReset) {
              setOtpPurpose("register");
              setSwitchAccountMode(true);
              switchScreen("signin");
            } else if (onAuthSuccess) {
              onAuthSuccess();
            } else {
              switchScreen("signin");
            }
          }}
          className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer"
        >
          {isPasswordReset ? "Sign In with New Password" : "Continue to Workspace"}
        </button>
      </div>
    );
  }

  if (screen === "lock") {
    let lockedInfo = user;
    if (!lockedInfo) {
      try {
        lockedInfo = JSON.parse(sessionStorage.getItem("dreams_locked_user") || "null");
      } catch {
        lockedInfo = null;
      }
    }
    const lockEmail = lockedInfo?.email || email;

    const handleUnlock = async (e) => {
      e.preventDefault();
      setErrorMsg("");
      if (!password) {
        setFieldErrors({ password: "Enter your password to unlock." });
        return;
      }
      setBusy(true);
      const { ok, data } = await authRequest(
        "/api/auth/unlock/",
        { email: lockEmail, password },
        authFetch
      );
      setBusy(false);

      if (!ok) {
        setErrorMsg(data.error || "Incorrect password.");
        return;
      }
      sessionStorage.removeItem("dreams_locked_user");
      setPassword("");
      if (onAuthSuccess) onAuthSuccess(data);
      else onNavigate?.("dashboard");
    };

    return (
      <div className={`${CARD} p-4 sm:p-7 space-y-5`}>
        <div className="text-center space-y-1.5">
          <ShieldCheck className="w-11 h-11 text-[#0E9384] mx-auto" />
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
            Welcome back, {lockedInfo?.name || "Workspace User"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Session locked ({lockEmail || "signed-in user"}).
          </p>
        </div>

        <form onSubmit={handleUnlock} noValidate className="space-y-4">
          <PasswordInput
            id="auth-lock-password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
            }}
            placeholder="Enter password to unlock"
            autoComplete="current-password"
            error={fieldErrors.password}
          />
          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/25 text-xs font-medium text-red-500" role="alert">
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-[8px] bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? "Unlocking..." : "Unlock Workspace"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("dreams_locked_user");
              setSwitchAccountMode(true);
              switchScreen("signin");
            }}
            className="text-xs text-zinc-500 hover:text-[#0F766E] font-semibold cursor-pointer"
          >
            Sign in as another user
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function AuthFlowPage({ initialScreen = "signin", user, onNavigate, onAuthSuccess, darkMode, setDarkMode }) {
  const [screen, setScreen] = useState(AUTH_ONLY_SCREENS.has(initialScreen) ? initialScreen : "signin");
  const [email, setEmail] = useState(user?.email || "");

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#161922] text-zinc-900 dark:text-slate-100 flex flex-col">
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#1B1F29]">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-[8px] bg-zinc-900 dark:bg-white flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0F766E] dark:text-zinc-900" />
          </div>
          <span className="font-extrabold text-base text-zinc-900 dark:text-white">
            Dreams<span className="text-[#0F766E]">AI</span>
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-slate-200 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-zinc-200 dark:border-slate-700 text-xs font-semibold hover:border-[#0F766E] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Landing Page
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-4">
          <AuthCard
            screen={screen}
            setScreen={setScreen}
            email={email}
            setEmail={setEmail}
            user={user}
            onAuthSuccess={onAuthSuccess}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}

const AUTH_SCREENS = [
  { id: "signin", label: "Sign In" },
  { id: "register", label: "Register" },
  { id: "forgot", label: "Forgot Password" },
  { id: "email-otp", label: "Email OTP" },
  { id: "two-step", label: "2-Step Verification" },
  { id: "reset", label: "Reset Password" },
  { id: "success", label: "Success" },
  { id: "lock", label: "Lock Screen" },
  { id: "coming-soon", label: "Coming Soon" },
  { id: "maintenance", label: "Maintenance" },
  { id: "404", label: "Error 404" },
  { id: "500", label: "Error 500" },
];

export function AuthAndSystemViews({ user, onAuthSuccess, onNavigate }) {
  const [screen, setScreen] = useState("signin");
  const [email, setEmail] = useState(user?.email || "");
  const [sessions, setSessions] = useState([]);

  const loadSessions = async () => {
    try {
      const res = await authFetch("/api/auth/sessions/");
      if (res.ok) setSessions(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) loadSessions();
    else setSessions([]);
  }, [user]);

  const handleRevokeSession = async (id) => {
    await authFetch(`/api/auth/sessions/${id}/`, { method: "DELETE" });
    loadSessions();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Authentication & Utility Screens</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Component gallery — also available as standalone full-screen pages from the Landing Page & User Menu
          </p>
        </div>
        <button
          onClick={() => onNavigate("landing")}
          className="px-3.5 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
        >
          Open Landing Page
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {AUTH_SCREENS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition cursor-pointer ${screen === s.id ? "bg-[#0F766E] text-white" : `${CARD} text-zinc-600 dark:text-slate-300`
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto pt-4">
        {AUTH_ONLY_SCREENS.has(screen) && (
          <AuthCard
            screen={screen}
            setScreen={setScreen}
            email={email}
            setEmail={setEmail}
            user={user}
            onAuthSuccess={(data) => {
              onAuthSuccess?.(data);
              loadSessions();
            }}
            onNavigate={onNavigate}
          />
        )}

        {user && sessions.length > 0 && (
          <div className={`${CARD} p-5 mt-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Active JWT Sessions ({sessions.length})</h3>
              <button onClick={loadSessions} className="text-xs text-[#0F766E] font-semibold cursor-pointer">Refresh</button>
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {s.ip_address} {s.is_current && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px]">Current</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{s.user_agent}</div>
                  </div>
                  <button onClick={() => handleRevokeSession(s.id)} className="text-red-500 hover:underline text-[11px] font-semibold shrink-0 cursor-pointer">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "coming-soon" && (
          <div className={`${CARD} p-8 space-y-4 text-center`}>
            <Clock className="w-12 h-12 text-[#0F766E] mx-auto" />
            <h2 className="text-xl font-extrabold">COMING SOON</h2>
            <p className="text-xs text-zinc-500">We are working hard to get everything just right.</p>
            <button onClick={() => onNavigate("coming:API & Webhooks")} className="px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer">
              Open Full Coming Soon Page
            </button>
          </div>
        )}

        {screen === "maintenance" && (
          <div className={`${CARD} p-8 space-y-3 text-center`}>
            <Wrench className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold">We are Under Maintenance</h2>
            <p className="text-xs text-zinc-500">Sorry for any inconvenience caused, we have almost done. Will get back soon!</p>
            <button onClick={() => onNavigate("maintenance")} className="px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer">
              Open Full Maintenance Page
            </button>
          </div>
        )}

        {(screen === "404" || screen === "500") && (
          <div className={`${CARD} p-8 space-y-3 text-center`}>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-extrabold">Error {screen}</h2>
            <p className="text-xs text-zinc-500">
              {screen === "404"
                ? "Oops, something went wrong. Sorry the page you are looking for doesn't exist or has been moved."
                : "Server Error 500. We apologise and are fixing the problem. Please try again at a later stage."}
            </p>
            <button onClick={() => onNavigate(screen)} className="px-4 py-2 rounded-[8px] bg-[#0F766E] text-white text-xs font-bold cursor-pointer">
              Open Full Error {screen} Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

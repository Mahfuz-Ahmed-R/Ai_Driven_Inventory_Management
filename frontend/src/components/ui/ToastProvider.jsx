import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

const STYLES = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-500/40",
    iconColor: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  error: {
    icon: XCircle,
    border: "border-red-500/40",
    iconColor: "text-red-500",
    bar: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/40",
    iconColor: "text-amber-500",
    bar: "bg-amber-500",
  },
  info: {
    icon: Info,
    border: "border-[#0E9384]/40",
    iconColor: "text-[#0E9384]",
    bar: "bg-[#0E9384]",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ type = "info", title, message, duration = 4500, actionLabel, onAction }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [{ id, type, title, message, actionLabel, onAction }, ...prev].slice(0, 5));
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = {
    push,
    dismiss,
    success: (message, opts = {}) => push({ type: "success", message, ...opts }),
    error: (message, opts = {}) => push({ type: "error", message, duration: 6000, ...opts }),
    warning: (message, opts = {}) => push({ type: "warning", message, ...opts }),
    info: (message, opts = {}) => push({ type: "info", message, ...opts }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const cfg = STYLES[t.type] || STYLES.info;
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative overflow-hidden rounded-[10px] bg-white dark:bg-[#1E222D] border ${cfg.border} shadow-xl p-3.5 flex items-start gap-3 transition-all animate-fade-slide-up`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-xs font-bold text-zinc-900 dark:text-white">{t.title}</div>}
                <div className="text-xs text-zinc-600 dark:text-slate-300 break-words">{t.message}</div>
                {t.actionLabel && t.onAction && (
                  <button
                    onClick={() => {
                      t.onAction();
                      dismiss(t.id);
                    }}
                    className="mt-1.5 inline-flex items-center px-2.5 py-1 rounded-[6px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold hover:opacity-90 transition cursor-pointer"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return ctx;
}

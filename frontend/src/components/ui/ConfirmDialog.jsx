import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        title: options?.title || "Confirm Destructive Action",
        description: options?.description || "This action cannot be undone. Are you sure you want to proceed?",
        confirmLabel: options?.confirmLabel || "Delete",
        cancelLabel: options?.cancelLabel || "Cancel",
        tone: options?.tone || "danger", // danger | warning
        itemCount: options?.itemCount || null,
        resolve,
      });
    });
  }, []);

  const handleClose = (accepted) => {
    if (submitting) return;
    setSubmitting(true);
    const res = state?.resolve;
    setState(null);
    setSubmitting(false);
    res?.(accepted);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 rounded-[12px] max-w-md w-full p-5 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                    state.tone === "warning"
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {state.tone === "warning" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 id="confirm-dialog-title" className="text-sm font-bold text-zinc-950 dark:text-white">
                    {state.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {state.description}
                  </p>
                  {state.itemCount ? (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[11px] font-bold">
                      Affects {state.itemCount} selected item{state.itemCount > 1 ? "s" : ""}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => handleClose(false)}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-slate-700/70">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleClose(false)}
                className="px-3.5 py-2 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:bg-zinc-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-[8px] text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                  state.tone === "warning"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {submitting ? "Processing..." : state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async ({ description }) => window.confirm(description || "Are you sure?");
  }
  return ctx;
}

import { Check, Loader2, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export function AutosaveIndicator({ status, lastSavedAt, errorMessage, onRetry }) {
  if (status === "idle" && !lastSavedAt) return null;

  const timeStr = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700/70">
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-[#0E9384]" />
          <span className="text-zinc-600 dark:text-slate-300">Saving draft...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">
            Saved{timeStr ? ` at ${timeStr}` : ""}
          </span>
        </>
      )}
      {status === "offline" && (
        <>
          <WifiOff className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">Saved locally (offline)</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-red-500" title={errorMessage}>Save failed</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 inline-flex items-center gap-0.5 underline font-bold text-red-500 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}

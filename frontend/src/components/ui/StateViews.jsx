import { Inbox, SearchX, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "Get started by creating a new item or importing data.",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}) {
  return (
    <div className="bg-white dark:bg-[#1E222D] rounded-[10px] border border-zinc-200 dark:border-slate-700/70 p-8 sm:p-10 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-slate-800 text-zinc-500 dark:text-slate-300 mx-auto flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded-[8px] bg-[#0F766E] text-zinc-950 text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-[8px] bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 text-xs font-semibold text-zinc-700 dark:text-slate-200 hover:border-[#0F766E] transition cursor-pointer"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoSearchResultsState({ query, onReset }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No matching results"
      description={
        query
          ? `No records matched "${query}". Try adjusting your search query or clearing active filters.`
          : "No records match the currently active filters."
      }
      actionLabel={onReset ? "Reset Filters & Search" : undefined}
      onAction={onReset}
    />
  );
}

export function LoadingState({ label = "Loading data..." }) {
  return (
    <div className="bg-white dark:bg-[#1E222D] rounded-[10px] border border-zinc-200 dark:border-slate-700/70 p-8 text-center space-y-2">
      <Loader2 className="w-6 h-6 text-[#0E9384] animate-spin mx-auto" />
      <div className="text-xs font-semibold text-zinc-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export function ErrorBanner({ title = "Unable to load data", message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-[10px] bg-red-500/10 border border-red-500/30 p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs font-bold text-red-600 dark:text-red-400">{title}</div>
          <div className="text-xs text-red-500/90 break-words">{message}</div>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

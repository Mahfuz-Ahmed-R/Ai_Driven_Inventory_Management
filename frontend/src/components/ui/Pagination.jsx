import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_PAGE_SIZE = 10;

export function paginateItems(items = [], page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    safePage,
    totalPages,
    totalItems,
    pageSize,
    pagedItems: items.slice(start, start + pageSize),
  };
}

export function usePagination(items = [], pageSize = DEFAULT_PAGE_SIZE, resetDeps = []) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const result = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    setPage,
    ...result,
  };
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
}) {
  if (!totalItems) return null;
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="px-4 py-3 border-t border-zinc-200 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-slate-400">
      <span>
        Showing {start}–{end} of{" "}
        <strong className="text-zinc-900 dark:text-white">{totalItems}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="p-1.5 rounded-[6px] border border-zinc-200 dark:border-slate-700 disabled:opacity-40 hover:border-[#0F766E] cursor-pointer disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 font-semibold text-zinc-900 dark:text-white">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="p-1.5 rounded-[6px] border border-zinc-200 dark:border-slate-700 disabled:opacity-40 hover:border-[#0F766E] cursor-pointer disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

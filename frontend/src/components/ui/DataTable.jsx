import { useMemo, useState, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Calendar,
  Download,
  Trash2,
  Check,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { TableSkeleton } from "./Skeleton";
import { EmptyState, NoSearchResultsState, ErrorBanner } from "./StateViews";

/**
 * Reusable SaaS DataTable with:
 * - Debounced search + external search sync
 * - Multi-filter bar (select filters + optional date-range) with persistent state & individual clear chips
 * - Sorting (asc/desc)
 * - Pagination (page size + page controls)
 * - Column customization (toggle visibility, persisted in localStorage)
 * - Row selection & Select-All + Bulk Actions bar
 * - Loading, Empty, No-Results, and Error states
 * - Responsive desktop table + mobile card layout
 */
export default function DataTable({
  data = [],
  columns = [],
  rowKey = "id",
  persistKey,
  loading = false,
  error = "",
  onRetry,
  searchPlaceholder = "Search...",
  externalSearch = "",
  filters = [], // [{ key, label, options: [{ label, value }] | string[], accessor?: (row) => val }]
  dateRangeConfig = null, // { label: "Date", accessor: (row) => "YYYY-MM-DD" }
  selectable = false,
  bulkActions = [], // [{ key, label, icon: Icon, variant: "danger"|"default", onClick: (selectedRows, clearSelection) => void }]
  onRowClick,
  exportFilename,
  emptyState,
  defaultSort = null, // { key, dir: "asc"|"desc" }
  defaultPageSize = 10,
}) {
  const storagePrefix = persistKey ? `dreams_dt_${persistKey}` : null;

  const [localSearch, setLocalSearch] = useState(() => {
    if (!storagePrefix) return "";
    try {
      return JSON.parse(localStorage.getItem(`${storagePrefix}_filters`) || "{}").search || "";
    } catch {
      return "";
    }
  });

  const [activeFilters, setActiveFilters] = useState(() => {
    if (!storagePrefix) return {};
    try {
      return JSON.parse(localStorage.getItem(`${storagePrefix}_filters`) || "{}").values || {};
    } catch {
      return {};
    }
  });

  const [dateRange, setDateRange] = useState(() => {
    if (!storagePrefix) return { from: "", to: "" };
    try {
      return JSON.parse(localStorage.getItem(`${storagePrefix}_filters`) || "{}").dateRange || { from: "", to: "" };
    } catch {
      return { from: "", to: "" };
    }
  });

  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [colsMenuOpen, setColsMenuOpen] = useState(false);

  const [hiddenCols, setHiddenCols] = useState(() => {
    if (!storagePrefix) return new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(`${storagePrefix}_cols`) || "null");
      if (Array.isArray(saved)) return new Set(saved);
    } catch {
      // ignore
    }
    return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key));
  });

  const debouncedLocalSearch = useDebounce(localSearch, 220);
  const effectiveSearch = (externalSearch || debouncedLocalSearch || "").trim().toLowerCase();

  useEffect(() => {
    if (!storagePrefix) return;
    try {
      localStorage.setItem(
        `${storagePrefix}_filters`,
        JSON.stringify({ search: localSearch, values: activeFilters, dateRange })
      );
    } catch {
      // ignore
    }
  }, [storagePrefix, localSearch, activeFilters, dateRange]);

  useEffect(() => {
    if (!storagePrefix) return;
    try {
      localStorage.setItem(`${storagePrefix}_cols`, JSON.stringify(Array.from(hiddenCols)));
    } catch {
      // ignore
    }
  }, [storagePrefix, hiddenCols]);

  const getRowId = (row, idx) => {
    if (typeof rowKey === "function") return rowKey(row, idx);
    return row?.[rowKey] ?? idx;
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (effectiveSearch) {
        const hay = columns
          .map((c) => {
            const v = c.searchValue ? c.searchValue(row) : c.accessor ? c.accessor(row) : row[c.key];
            return v == null ? "" : String(v);
          })
          .join(" ")
          .toLowerCase();
        if (!hay.includes(effectiveSearch)) return false;
      }

      for (const f of filters) {
        const selected = activeFilters[f.key];
        if (!selected || selected === "All") continue;
        const val = f.accessor ? f.accessor(row) : row[f.key];
        if (String(val ?? "") !== String(selected)) return false;
      }

      if (dateRangeConfig && (dateRange.from || dateRange.to)) {
        const rawDate = dateRangeConfig.accessor ? dateRangeConfig.accessor(row) : row[dateRangeConfig.key];
        const dateStr = rawDate ? String(rawDate).slice(0, 10) : "";
        if (dateRange.from && (!dateStr || dateStr < dateRange.from)) return false;
        if (dateRange.to && (!dateStr || dateStr > dateRange.to)) return false;
      }

      return true;
    });
  }, [data, columns, effectiveSearch, filters, activeFilters, dateRangeConfig, dateRange]);

  const sortedData = useMemo(() => {
    if (!sort?.key) return filteredData;
    const col = columns.find((c) => c.key === sort.key);
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...filteredData].sort((a, b) => {
      const va = col?.sortValue ? col.sortValue(a) : col?.accessor ? col.accessor(a) : a[sort.key];
      const vb = col?.sortValue ? col.sortValue(b) : col?.accessor ? col.accessor(b) : b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });
  }, [filteredData, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, activeFilters, dateRange, pageSize]);

  const toggleSort = (key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const hasActiveFilters =
    Boolean(localSearch) ||
    Object.values(activeFilters).some((v) => v && v !== "All") ||
    Boolean(dateRange.from || dateRange.to);

  const resetAllFilters = () => {
    setLocalSearch("");
    setActiveFilters({});
    setDateRange({ from: "", to: "" });
  };

  const pageIds = pagedData.map((r, i) => getRowId(r, (safePage - 1) * pageSize + i));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const selectedRows = useMemo(
    () => sortedData.filter((r, i) => selectedIds.has(getRowId(r, i))),
    [sortedData, selectedIds]
  );

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleExportCsv = (rowsToExport) => {
    const cols = visibleColumns.filter((c) => !c.noExport);
    const header = cols.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(",");
    const lines = rowsToExport.map((row) =>
      cols
        .map((c) => {
          const val = c.accessor ? c.accessor(row) : row[c.key];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename || "export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && data.length === 0) {
    return <TableSkeleton rows={6} cols={Math.min(6, columns.length || 5)} />;
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {/* Toolbar: Search + Filters + Column Customizer + Export */}
      <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[160px] w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F766E]"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                aria-label="Clear table search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => {
              const opts = f.options || [];
              return (
                <select
                  key={f.key}
                  aria-label={f.label}
                  value={activeFilters[f.key] || "All"}
                  onChange={(e) => setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="All">{f.label}: All</option>
                  {opts.map((opt) => {
                    const val = typeof opt === "object" ? opt.value : opt;
                    const lbl = typeof opt === "object" ? opt.label : opt;
                    if (val === "All") return null;
                    return (
                      <option key={val} value={val}>
                        {lbl}
                      </option>
                    );
                  })}
                </select>
              );
            })}

            {dateRangeConfig && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
                <input
                  type="date"
                  aria-label={`${dateRangeConfig.label || "Date"} from`}
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="px-2 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200"
                />
                <span className="text-zinc-400">-</span>
                <input
                  type="date"
                  aria-label={`${dateRangeConfig.label || "Date"} to`}
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="px-2 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200"
                />
              </div>
            )}

            {/* Column customizer */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColsMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-xs font-medium text-zinc-700 dark:text-slate-200 hover:border-[#0F766E] transition cursor-pointer"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
              </button>
              {colsMenuOpen && (
                <div
                  onMouseLeave={() => setColsMenuOpen(false)}
                  className="absolute right-0 mt-1.5 w-48 rounded-[10px] bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 shadow-xl p-2 z-30 space-y-1"
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">Visible Columns</div>
                  {columns.map((c) => {
                    const checked = !hiddenCols.has(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() =>
                          setHiddenCols((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key);
                            else if (columns.length - next.size > 1) next.add(c.key);
                            return next;
                          })
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] text-xs hover:bg-zinc-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                      >
                        <span className="truncate">{c.label}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-[#0E9384]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {exportFilename && (
              <button
                type="button"
                onClick={() => handleExportCsv(sortedData)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-slate-800 text-[11px]">
            <span className="text-zinc-400 font-medium mr-1">Active filters:</span>
            {localSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0F766E]/15 text-zinc-900 dark:text-[#0F766E] font-semibold">
                Search: "{localSearch}"
                <button type="button" onClick={() => setLocalSearch("")} className="cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {Object.entries(activeFilters).map(([k, v]) =>
              v && v !== "All" ? (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0E9384]/15 text-[#0E9384] font-semibold"
                >
                  {filters.find((f) => f.key === k)?.label || k}: {v}
                  <button
                    type="button"
                    onClick={() => setActiveFilters((prev) => ({ ...prev, [k]: "All" }))}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null
            )}
            {(dateRange.from || dateRange.to) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold">
                {dateRange.from || "..."} → {dateRange.to || "..."}
                <button
                  type="button"
                  onClick={() => setDateRange({ from: "", to: "" })}
                  className="cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset All
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectable && selectedRows.length > 0 && (
        <div className="rounded-[8px] bg-zinc-900 dark:bg-slate-800 border border-[#0F766E]/50 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded bg-[#0F766E] text-zinc-950 font-extrabold">
              {selectedRows.length}
            </span>
            <span>selected</span>
            {sortedData.length > pagedData.length && selectedRows.length < sortedData.length && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(sortedData.map((r, i) => getRowId(r, i))))}
                className="underline text-[#0F766E] text-[11px] ml-1 cursor-pointer"
              >
                Select all {sortedData.length} filtered
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv(selectedRows)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Selected
            </button>
            {bulkActions.map((act) => {
              const Icon = act.icon || Trash2;
              return (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => act.onClick(selectedRows, clearSelection)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-xs font-bold transition cursor-pointer ${
                    act.variant === "danger"
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-[#0F766E] text-zinc-950 hover:opacity-90"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {act.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={clearSelection}
              className="px-2 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Data Display */}
      {data.length === 0 ? (
        emptyState || <EmptyState />
      ) : sortedData.length === 0 ? (
        <NoSearchResultsState query={localSearch || externalSearch} onReset={resetAllFilters} />
      ) : (
        <div className="bg-white dark:bg-[#1E222D] rounded-[8px] border border-zinc-200 dark:border-slate-700/70 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  {selectable && (
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all rows on page"
                        checked={allPageSelected}
                        onChange={toggleSelectAllPage}
                        className="rounded accent-[#0E9384] cursor-pointer"
                      />
                    </th>
                  )}
                  {visibleColumns.map((col) => {
                    const isSorted = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`py-3 px-4 whitespace-nowrap ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                        }`}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer uppercase"
                          >
                            <span>{col.label}</span>
                            {isSorted ? (
                              sort.dir === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-[#0F766E]" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-[#0F766E]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pagedData.map((row, idx) => {
                  const id = getRowId(row, (safePage - 1) * pageSize + idx);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={`${
                        onRowClick ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40" : ""
                      } ${isSelected ? "bg-[#0F766E]/5" : ""}`}
                    >
                      {selectable && (
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select row ${id}`}
                            checked={isSelected}
                            onChange={() => toggleRow(id)}
                            className="rounded accent-[#0E9384] cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3 px-4 ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                          }`}
                        >
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {pagedData.map((row, idx) => {
              const id = getRowId(row, (safePage - 1) * pageSize + idx);
              const isSelected = selectedIds.has(id);
              return (
                <div
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`p-3.5 space-y-2 ${isSelected ? "bg-[#0F766E]/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded accent-[#0E9384]"
                        />
                      )}
                      <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                        {visibleColumns[0]?.render
                          ? visibleColumns[0].render(row)
                          : row[visibleColumns[0]?.key]}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    {visibleColumns.slice(1).map((col) => (
                      <div key={col.key} className="min-w-0">
                        <span className="text-zinc-400 block text-[10px]">{col.label}</span>
                        <div className="font-medium text-zinc-800 dark:text-slate-200 truncate">
                          {col.render ? col.render(row) : row[col.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sortedData.length)} of{" "}
                <strong className="text-zinc-900 dark:text-white">{sortedData.length}</strong>
              </span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-[6px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-xs"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-[6px] border border-zinc-200 dark:border-slate-700 disabled:opacity-40 hover:border-[#0F766E] cursor-pointer"
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-[6px] border border-zinc-200 dark:border-slate-700 disabled:opacity-40 hover:border-[#0F766E] cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

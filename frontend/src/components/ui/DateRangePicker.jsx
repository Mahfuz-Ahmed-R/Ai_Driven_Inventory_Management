import { useRef } from "react";
import { Calendar, X } from "lucide-react";

/**
 * Normalizes ISO ("2025-01-10", "2025-01-10T12:00:00Z") or human-readable
 * ("24 Dec 2024") date strings into "YYYY-MM-DD" for reliable range filtering.
 */
export function normalizeDateString(raw) {
  if (!raw) return "";
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function openDateInputPicker(inputEl) {
  if (!inputEl) return;
  if (typeof inputEl.showPicker === "function") {
    try {
      inputEl.showPicker();
      return;
    } catch {
      // Fallback to focus if showPicker is blocked
    }
  }
  inputEl.focus();
}

export default function DateRangePicker({
  value = { from: "", to: "" },
  onChange,
  label = "Date",
  className = "",
}) {
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const from = value?.from || "";
  const to = value?.to || "";

  const handleFromChange = (nextFrom) => {
    if (nextFrom && to && nextFrom > to) {
      onChange({ from: nextFrom, to: nextFrom });
    } else {
      onChange({ from: nextFrom, to });
    }
  };

  const handleToChange = (nextTo) => {
    if (nextTo && from && nextTo < from) {
      onChange({ from: nextTo, to: nextTo });
    } else {
      onChange({ from, to: nextTo });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs ${className}`}>
      <button
        type="button"
        onClick={() => openDateInputPicker(fromRef.current)}
        aria-label={`Open ${label} calendar`}
        title={`Select ${label} range`}
        className="p-1.5 rounded-[6px] text-zinc-500 dark:text-slate-400 hover:text-[#0F766E] dark:hover:text-[#14B8A6] hover:bg-zinc-100 dark:hover:bg-slate-800 transition cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
      <input
        ref={fromRef}
        type="date"
        aria-label={`${label} from`}
        value={from}
        max={to || undefined}
        onChange={(e) => handleFromChange(e.target.value)}
        onClick={(e) => openDateInputPicker(e.currentTarget)}
        className="px-2 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200 focus:outline-none focus:border-[#0F766E] cursor-pointer"
      />
      <span className="text-zinc-400">-</span>
      <input
        ref={toRef}
        type="date"
        aria-label={`${label} to`}
        value={to}
        min={from || undefined}
        onChange={(e) => handleToChange(e.target.value)}
        onClick={(e) => openDateInputPicker(e.currentTarget)}
        className="px-2 py-1.5 text-xs rounded-[8px] bg-zinc-50 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-200 focus:outline-none focus:border-[#0F766E] cursor-pointer"
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange({ from: "", to: "" })}
          aria-label={`Clear ${label} filter`}
          title="Clear dates"
          className="p-1 rounded-[6px] text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

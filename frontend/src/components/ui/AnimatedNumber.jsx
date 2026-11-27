import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Counts smoothly from 0 to `target` on mount and whenever `target` changes.
 */
export function useCountUp(target, { duration = 850, enabled = true } = {}) {
  const numericTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [displayValue, setDisplayValue] = useState(() =>
    !enabled || prefersReducedMotion() ? numericTarget : 0
  );
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || duration <= 0) {
      setDisplayValue(numericTarget);
      return;
    }

    setDisplayValue(0);
    let startTime = null;

    const tick = (now) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for a snappy, natural finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(numericTarget * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(numericTarget);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [numericTarget, duration, enabled]);

  return displayValue;
}

/**
 * Renders a number that animates from 0 to its actual value on every load or refresh.
 */
export function AnimatedNumber({
  value = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 850,
  locale = true,
  className = "",
}) {
  const current = useCountUp(value, { duration });
  const rounded =
    decimals > 0
      ? Number(current.toFixed(decimals))
      : Math.round(current);

  const formatted = locale
    ? rounded.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : decimals > 0
    ? rounded.toFixed(decimals)
    : String(rounded);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Percent-based progress bar that animates from 0% to target percentage on mount/update.
 */
export function AnimatedProgressBar({
  value = 0,
  max = 100,
  duration = 850,
  showPercent = false,
  barClassName = "bg-[#0F766E] dark:bg-[#14B8A6]",
  trackClassName = "bg-zinc-200/80 dark:bg-zinc-800",
  heightClass = "h-1.5",
  className = "",
}) {
  const pctTarget = max > 0 ? Math.max(0, Math.min(100, (Number(value || 0) / max) * 100)) : 0;
  const currentPct = useCountUp(pctTarget, { duration });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 rounded-full overflow-hidden ${trackClassName} ${heightClass}`}>
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${currentPct.toFixed(1)}%` }}
        />
      </div>
      {showPercent && (
        <span className="text-[11px] font-semibold tabular-nums text-zinc-600 dark:text-zinc-300 w-9 text-right">
          {Math.round(currentPct)}%
        </span>
      )}
    </div>
  );
}

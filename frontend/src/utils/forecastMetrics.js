/**
 * Shared business & forecasting metric helpers derived strictly from backend job data.
 * Never invents hardcoded or fake numbers.
 */

export const ALL_HORIZONS = [7, 14, 28, 60, 90];

export function getSupportedHorizons(job) {
  if (!job) return [7, 14, 28];
  const fromMeta = job.dataset_meta?.supported_horizons || job.summary_kpis?.supported_horizons;
  const firstLen = job.skus?.[0]?.forecast_payload?.forecast_dates?.length || 28;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    return fromMeta.filter((h) => h <= firstLen);
  }
  const available = ALL_HORIZONS.filter((h) => h <= firstLen);
  return available.length > 0 ? available : [Math.min(28, firstLen)];
}

export function hasRealStockData(job) {
  if (!job) return false;
  if (typeof job.dataset_meta?.has_real_stock === "boolean") return job.dataset_meta.has_real_stock;
  if (typeof job.summary_kpis?.has_real_stock === "boolean") return job.summary_kpis.has_real_stock;
  return true;
}

export function hasRealPriceData(job) {
  if (!job) return false;
  if (typeof job.dataset_meta?.has_real_price === "boolean") return job.dataset_meta.has_real_price;
  if (typeof job.summary_kpis?.has_real_price === "boolean") return job.summary_kpis.has_real_price;
  return true;
}

export function getSkuHistAvg(sku) {
  const payload = sku?.forecast_payload;
  if (typeof payload?.hist_avg_daily === "number") return payload.hist_avg_daily;
  const hist = payload?.history_sales || [];
  if (hist.length === 0) return 0;
  const sum = hist.reduce((a, b) => a + Number(b || 0), 0);
  return Number((sum / hist.length).toFixed(2));
}

export function getSkuTrendPct(sku) {
  const payload = sku?.forecast_payload;
  if (typeof payload?.demand_trend_pct === "number") return payload.demand_trend_pct;
  const hist = payload?.history_sales || [];
  const win = Math.min(28, Math.floor(hist.length / 2));
  if (win < 3) return 0;
  const recent = hist.slice(-win).reduce((a, b) => a + Number(b || 0), 0) / win;
  const prev = hist.slice(-2 * win, -win).reduce((a, b) => a + Number(b || 0), 0) / win;
  if (prev <= 0) return recent > 0 ? 100 : 0;
  return Number((((recent - prev) / prev) * 100).toFixed(1));
}

export function getSkuHorizonStats(sku, horizon = 28) {
  const payload = sku?.forecast_payload || {};
  const fSales = (payload.forecast_sales || []).slice(0, horizon);
  const fDates = (payload.forecast_dates || []).slice(0, horizon);
  const fLower = (payload.forecast_lower || []).slice(0, horizon);
  const fUpper = (payload.forecast_upper || []).slice(0, horizon);

  const predictedTotal = fSales.length
    ? Number(fSales.reduce((a, b) => a + Number(b || 0), 0).toFixed(1))
    : Number(((sku?.avg_daily_velocity || 0) * horizon).toFixed(1));

  const forecastAvg = fSales.length
    ? Number((predictedTotal / fSales.length).toFixed(2))
    : Number((sku?.avg_daily_velocity || 0).toFixed(2));

  const histAvg = getSkuHistAvg(sku);
  const trendPct =
    histAvg > 0
      ? Number((((forecastAvg - histAvg) / histAvg) * 100).toFixed(1))
      : getSkuTrendPct(sku);

  const price = Number(sku?.price || 0);
  const expectedRevenue = Number((predictedTotal * price).toFixed(2));

  return {
    horizon,
    fDates,
    fSales,
    fLower,
    fUpper,
    predictedTotal,
    forecastAvg,
    histAvg,
    trendPct,
    expectedRevenue,
  };
}

export function classifyInventoryStatus(sku, realStockAvailable = true) {
  if (!realStockAvailable) {
    return {
      key: "unavailable",
      label: "Stock Unavailable",
      cls: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30",
    };
  }
  const stock = Number(sku?.current_stock ?? 0);
  const safety = Number(sku?.safety_stock ?? 0);
  const rop = Number(sku?.reorder_point ?? 0);
  const daysLeft = Number(sku?.days_left ?? 999);

  if (stock <= 0) {
    return {
      key: "out_of_stock",
      label: "Out of Stock",
      cls: "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/40",
    };
  }
  if (sku?.urgency === "critical" || (safety > 0 && stock <= safety)) {
    return {
      key: "critical",
      label: "Critical Stock",
      cls: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
    };
  }
  if (sku?.urgency === "watch" || (rop > 0 && stock <= rop)) {
    return {
      key: "low",
      label: "Low Stock",
      cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    };
  }
  if (sku?.urgency === "overstock" || daysLeft >= 60) {
    return {
      key: "excess",
      label: "Excess Stock",
      cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
    };
  }
  return {
    key: "healthy",
    label: "Healthy Stock",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  };
}

export function classifyReplenishmentPriority(sku) {
  const stock = Number(sku?.current_stock ?? 0);
  const qty = Number(sku?.suggested_order_qty ?? 0);
  if (qty <= 0 && stock > Number(sku?.reorder_point ?? 0)) {
    return {
      key: "none",
      label: "No Action Required",
      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    };
  }
  if (stock <= 0 || sku?.urgency === "critical") {
    return {
      key: "urgent",
      label: "Urgent",
      cls: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
    };
  }
  if (sku?.urgency === "watch" || stock <= Number(sku?.reorder_point ?? 0)) {
    return {
      key: "high",
      label: "High Priority",
      cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    };
  }
  if (qty > 0) {
    return {
      key: "normal",
      label: "Normal",
      cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30",
    };
  }
  return {
    key: "none",
    label: "No Action Required",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  };
}

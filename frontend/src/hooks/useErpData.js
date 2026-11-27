import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../utils/apiClient";
import { getStoredTokens } from "./useAuth";

const EMPTY_ERP = {
  products: [],
  categories: [],
  sub_categories: [],
  brands: [],
  units: [],
  variants: [],
  warranties: [],
  warehouses: [],
  stores: [],
  customers: [],
  billers: [],
  suppliers: [],
  transfers: [],
  adjustments: [],
  pos_orders: [],
  invoices: [],
};

export async function erpRequest(url, method = "GET", body = null) {
  return apiRequest(url, { method, body });
}

export function useErpData() {
  const [erpData, setErpData] = useState(EMPTY_ERP);
  const [erpLoading, setErpLoading] = useState(true);
  const [erpError, setErpError] = useState("");
  const erpDataRef = useRef(erpData);
  erpDataRef.current = erpData;

  const refreshErpData = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setErpData(EMPTY_ERP);
      setErpLoading(false);
      return null;
    }
    try {
      const data = await apiRequest("/api/erp/bootstrap/", { retries: 1 });
      setErpData(data);
      setErpError("");
      return data;
    } catch (err) {
      setErpError(err.message || "Failed to load ERP data");
      return null;
    } finally {
      setErpLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshErpData();
  }, [refreshErpData]);

  // Generic optimistic mutator: applies updater immediately, rolls back on error
  const runOptimistic = useCallback(async (updater, requestFn) => {
    const snapshot = erpDataRef.current;
    setErpData((prev) => updater(prev));
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      setErpData(snapshot);
      throw err;
    }
  }, []);

  const optimisticDeleteProduct = useCallback(
    (sku) =>
      runOptimistic(
        (prev) => ({
          ...prev,
          products: (prev.products || []).filter((p) => p.sku !== sku),
        }),
        () => erpRequest(`/api/erp/products/${encodeURIComponent(sku)}/`, "DELETE")
      ),
    [runOptimistic]
  );

  const optimisticBulkProducts = useCallback(
    (skus, action, extra = {}) =>
      runOptimistic(
        (prev) => {
          const skuSet = new Set(skus);
          if (action === "delete") {
            return { ...prev, products: (prev.products || []).filter((p) => !skuSet.has(p.sku)) };
          }
          if (action === "update_category" && extra.category) {
            return {
              ...prev,
              products: (prev.products || []).map((p) =>
                skuSet.has(p.sku) ? { ...p, category: extra.category } : p
              ),
            };
          }
          if (action === "update_warehouse" && extra.warehouse) {
            return {
              ...prev,
              products: (prev.products || []).map((p) =>
                skuSet.has(p.sku) ? { ...p, warehouse: extra.warehouse } : p
              ),
            };
          }
          return prev;
        },
        () => erpRequest("/api/erp/products/bulk/", "POST", { skus, action, ...extra })
      ),
    [runOptimistic]
  );

  const optimisticCreateProduct = useCallback(
    async (payload) => {
      const tempId = `temp-${Date.now()}`;
      const res = await runOptimistic(
        (prev) => ({
          ...prev,
          products: [{ id: tempId, ...payload, method: "Database" }, ...(prev.products || [])],
        }),
        () => erpRequest("/api/erp/products/", "POST", payload)
      );
      setErpData((prev) => ({
        ...prev,
        products: (prev.products || []).map((p) => (p.id === tempId ? res : p)),
      }));
      return res;
    },
    [runOptimistic]
  );

  return {
    erpData,
    erpLoading,
    erpError,
    refreshErpData,
    runOptimistic,
    optimisticDeleteProduct,
    optimisticBulkProducts,
    optimisticCreateProduct,
  };
}

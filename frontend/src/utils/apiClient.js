import { getStoredTokens, setStoredAuth, clearStoredAuth } from "../hooks/useAuth";

const ERROR_LOG_KEY = "dreams_client_error_logs";
const MAX_LOGS = 40;

export function logClientError(context, error, meta = {}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    context,
    message: error?.message || String(error || "Unknown error"),
    status: error?.status || null,
    code: error?.code || null,
    meta,
  };
  try {
    const existing = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]");
    const next = [entry, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  if (import.meta.env.DEV) {
    console.error(`[DreamsAI:${context}]`, error, meta);
  }
  return entry;
}

export function getClientErrorLogs() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearClientErrorLogs() {
  localStorage.removeItem(ERROR_LOG_KEY);
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null, retryable = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export function getFriendlyErrorMessage(err) {
  if (!err) return "An unexpected error occurred.";
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Changes will be preserved until your connection returns.";
  }
  if (err.name === "AbortError") {
    return "The request timed out. Please check your connection and retry.";
  }
  if (err.code === "TIER_LIMIT" || err.code === "TIER_LOCKED") {
    return err.message;
  }
  if (err.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (err.status === 403) {
    return err.message || "You do not have permission to perform this action.";
  }
  if (err.status === 404) {
    return err.message || "The requested resource was not found.";
  }
  if (err.status >= 500) {
    return err.message || "Server error encountered. Please retry in a moment.";
  }
  return err.message || "Request failed. Please try again.";
}

export async function apiRequest(
  url,
  { method = "GET", body = null, headers = {}, timeoutMs = 15000, retries = 0, retryDelayMs = 600, signal } = {}
) {
  const attemptFetch = async (attempt) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const { access, refresh } = getStoredTokens();
      const reqHeaders = { ...headers };
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      if (!isFormData && !reqHeaders["Content-Type"]) {
        reqHeaders["Content-Type"] = "application/json";
      }
      if (access && !reqHeaders.Authorization) {
        reqHeaders.Authorization = `Bearer ${access}`;
      }

      const fetchOpts = {
        method,
        headers: reqHeaders,
        credentials: "include",
        signal: controller.signal,
      };
      if (body !== null && method !== "GET" && method !== "HEAD") {
        fetchOpts.body = isFormData || typeof body === "string" ? body : JSON.stringify(body);
      }

      let res = await fetch(url, fetchOpts);

      if (res.status === 401 && refresh) {
        const refreshRes = await fetch("/api/auth/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
          credentials: "include",
        });
        if (refreshRes.ok) {
          const rData = await refreshRes.json();
          setStoredAuth(rData);
          reqHeaders.Authorization = `Bearer ${rData.access}`;
          res = await fetch(url, { ...fetchOpts, headers: reqHeaders });
        } else {
          clearStoredAuth();
        }
      }

      if (res.status === 204) return { ok: true };

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      if (!res.ok) {
        const msg = (typeof data === "object" && (data.error || data.detail || data.message)) || `Request failed (${res.status})`;
        const code = (typeof data === "object" && data.code) || `HTTP_${res.status}`;
        const retryable = res.status >= 500 || res.status === 429;
        throw new ApiError(msg, { status: res.status, code, details: data, retryable });
      }

      return data;
    } catch (err) {
      const isNetworkOrTimeout = err.name === "AbortError" || err instanceof TypeError;
      const shouldRetry = attempt < retries && (isNetworkOrTimeout || err.retryable);
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
        return attemptFetch(attempt + 1);
      }
      const normalized =
        err instanceof ApiError
          ? err
          : new ApiError(getFriendlyErrorMessage(err), {
              status: 0,
              code: err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
              retryable: true,
            });
      logClientError(`apiRequest:${method} ${url}`, normalized);
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  };

  return attemptFetch(0);
}

import { useState, useEffect, useCallback } from "react";

const ACCESS_KEY = "dreams_jwt_access";
const REFRESH_KEY = "dreams_jwt_refresh";
const USER_KEY = "dreams_auth_user";
const REMEMBER_KEY = "dreams_remember_me";

function getAuthStorage() {
  if (sessionStorage.getItem(ACCESS_KEY)) return sessionStorage;
  if (localStorage.getItem(ACCESS_KEY)) return localStorage;
  return localStorage.getItem(REMEMBER_KEY) === "false" ? sessionStorage : localStorage;
}

export function getStoredTokens() {
  return {
    access: sessionStorage.getItem(ACCESS_KEY) || localStorage.getItem(ACCESS_KEY) || "",
    refresh: sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY) || "",
  };
}

export function setStoredAuth({ access, refresh, user, remember_me }, rememberOverride) {
  const remember =
    typeof rememberOverride === "boolean"
      ? rememberOverride
      : typeof remember_me === "boolean"
      ? remember_me
      : localStorage.getItem(REMEMBER_KEY) !== "false" && !sessionStorage.getItem(ACCESS_KEY);

  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(ACCESS_KEY);
  other.removeItem(REFRESH_KEY);
  other.removeItem(USER_KEY);

  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  if (access) target.setItem(ACCESS_KEY, access);
  if (refresh) target.setItem(REFRESH_KEY, refresh);
  if (user) target.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(ACCESS_KEY);
    store.removeItem(REFRESH_KEY);
    store.removeItem(USER_KEY);
  }
  localStorage.removeItem(REMEMBER_KEY);
}

export async function authFetch(url, options = {}) {
  const { access, refresh } = getStoredTokens();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  let res = await fetch(url, { ...options, headers, credentials: "include" });
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
      headers.Authorization = `Bearer ${rData.access}`;
      res = await fetch(url, { ...options, headers, credentials: "include" });
    } else {
      clearStoredAuth();
    }
  }
  return res;
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setAuthLoading(false);
      return null;
    }
    try {
      const res = await authFetch("/api/auth/me/");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSession(data.session);
        getAuthStorage().setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      clearStoredAuth();
      setUser(null);
      setSession(null);
    } catch {
      // Backend offline
    } finally {
      setAuthLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const saveAuthSession = useCallback((data) => {
    setStoredAuth(data);
    if (data.user) setUser(data.user);
    if (data.session_id) setSession({ id: data.session_id });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout/", { method: "POST", body: "{}" });
    } catch {
      // ignore
    }
    clearStoredAuth();
    setUser(null);
    setSession(null);
  }, []);

  return { user, session, authLoading, checkSession, saveAuthSession, logout };
}

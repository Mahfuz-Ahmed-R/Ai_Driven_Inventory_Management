import { useEffect, useRef, useState, useCallback } from "react";

export function useAutosave({ key, data, onRemoteSave, debounceMs = 800, enabled = true }) {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error | offline
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const isFirstRender = useRef(true);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const performSave = useCallback(
    async (payload) => {
      if (!enabled) return;
      setStatus("saving");
      setErrorMessage("");
      try {
        if (key) {
          localStorage.setItem(key, JSON.stringify({ data: payload, savedAt: Date.now() }));
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setStatus("offline");
          setLastSavedAt(new Date());
          return;
        }
        if (onRemoteSave) {
          await onRemoteSave(payload);
        }
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch (err) {
        setStatus("error");
        setErrorMessage(err?.message || "Failed to autosave");
      }
    },
    [key, onRemoteSave, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      performSave(data);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [data, debounceMs, enabled, performSave]);

  const loadDraft = useCallback(() => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    if (key) localStorage.removeItem(key);
    setStatus("idle");
    setLastSavedAt(null);
    setErrorMessage("");
  }, [key]);

  const retrySave = useCallback(() => {
    return performSave(latestDataRef.current);
  }, [performSave]);

  return { status, lastSavedAt, errorMessage, loadDraft, clearDraft, retrySave, saveNow: () => performSave(latestDataRef.current) };
}

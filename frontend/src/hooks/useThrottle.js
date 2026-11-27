import { useEffect, useRef, useState, useCallback } from "react";

export function useThrottle(value, limitMs = 200) {
  const [throttled, setThrottled] = useState(value);
  const lastRanRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const remaining = limitMs - (now - lastRanRef.current);
    if (remaining <= 0) {
      lastRanRef.current = now;
      setThrottled(value);
      return;
    }
    const timer = setTimeout(() => {
      lastRanRef.current = Date.now();
      setThrottled(value);
    }, remaining);
    return () => clearTimeout(timer);
  }, [value, limitMs]);

  return throttled;
}

export function useThrottledCallback(callback, limitMs = 400) {
  const cbRef = useRef(callback);
  const lastRanRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args) => {
      const now = Date.now();
      const remaining = limitMs - (now - lastRanRef.current);
      if (remaining <= 0) {
        lastRanRef.current = now;
        cbRef.current(...args);
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          lastRanRef.current = Date.now();
          timerRef.current = null;
          cbRef.current(...args);
        }, remaining);
      }
    },
    [limitMs]
  );
}

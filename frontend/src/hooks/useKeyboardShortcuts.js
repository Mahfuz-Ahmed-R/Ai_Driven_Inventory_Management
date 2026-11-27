import { useEffect, useRef } from "react";

function isInputElement(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts({
  onOpenPalette,
  onOpenShortcuts,
  onNavigate,
  onSave,
  onEscape,
}) {
  const chordRef = useRef({ key: null, time: 0 });

  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "k") {
        e.preventDefault();
        onOpenPalette?.();
        return;
      }

      if (mod && key === "s") {
        if (onSave) {
          const handled = onSave(e);
          if (handled) e.preventDefault();
        }
        return;
      }

      if (key === "escape") {
        onEscape?.();
        return;
      }

      if (isInputElement(e.target)) return;

      if ((e.shiftKey && e.key === "?") || (mod && key === "/")) {
        e.preventDefault();
        onOpenShortcuts?.();
        return;
      }

      const now = Date.now();
      if (chordRef.current.key === "g" && now - chordRef.current.time < 900) {
        chordRef.current = { key: null, time: 0 };
        if (key === "d") {
          e.preventDefault();
          onNavigate?.("dashboard");
        } else if (key === "p") {
          e.preventDefault();
          onNavigate?.("products");
        } else if (key === "r") {
          e.preventDefault();
          onNavigate?.("report");
        } else if (key === "u") {
          e.preventDefault();
          onNavigate?.("upload");
        } else if (key === "f") {
          e.preventDefault();
          onNavigate?.("referrals");
        }
        return;
      }

      if (key === "g" && !mod && !e.altKey) {
        chordRef.current = { key: "g", time: now };
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette, onOpenShortcuts, onNavigate, onSave, onEscape]);
}

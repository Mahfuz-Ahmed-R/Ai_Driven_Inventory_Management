import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Ctrl / ⌘", "K"], desc: "Open Command Palette" },
  { keys: ["Shift", "?"], desc: "Show Keyboard Shortcuts" },
  { keys: ["Ctrl / ⌘", "S"], desc: "Save active form / draft" },
  { keys: ["G", "D"], desc: "Go to Dashboard" },
  { keys: ["G", "P"], desc: "Go to Products" },
  { keys: ["G", "R"], desc: "Go to Inventory Report" },
  { keys: ["G", "U"], desc: "Go to Upload CSV" },
  { keys: ["G", "F"], desc: "Go to Referrals & Affiliates" },
  { keys: ["Esc"], desc: "Close active modal or palette" },
];

export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1E222D] border border-zinc-200 dark:border-slate-700 rounded-[12px] shadow-2xl p-5 space-y-4 animate-modal-pop"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#0F766E]" />
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-slate-800">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-600 dark:text-slate-300">{s.desc}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-zinc-400 text-[10px]">+</span>}
                    <kbd className="px-2 py-0.5 rounded-[5px] bg-zinc-100 dark:bg-[#161922] border border-zinc-200 dark:border-slate-700 font-mono text-[11px] font-bold text-zinc-800 dark:text-slate-200">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-zinc-400 pt-1">
          Navigation shortcuts ignore keystrokes when typing inside form inputs.
        </div>
      </div>
    </div>
  );
}

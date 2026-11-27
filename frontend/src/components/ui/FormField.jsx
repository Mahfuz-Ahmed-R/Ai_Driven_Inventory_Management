import { CheckCircle2, AlertCircle } from "lucide-react";

export function FormField({
  label,
  htmlFor,
  required = false,
  error = "",
  hint = "",
  touched = false,
  valid = false,
  children,
}) {
  const showError = Boolean(touched && error);
  const showValid = Boolean(touched && !error && valid);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-slate-300"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          {showValid && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
          )}
        </label>
      )}
      {children}
      {showError ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-500" role="alert">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[10px] text-zinc-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

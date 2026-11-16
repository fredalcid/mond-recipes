import type { ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Labelled input with accessible hint and error text. */
export function Field({ label, name, error, hint, id, className = "", ...props }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-12 rounded-xl border bg-white px-4 text-base text-ink placeholder:text-ink-muted/70 focus:border-forest-900 focus:outline-none focus-visible:outline-3 focus-visible:outline-gold-600 ${
          error ? "border-danger" : "border-sand-strong"
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-danger/30 bg-[#fbeae7] text-danger",
    success: "border-success/30 bg-forest-100 text-success",
    info: "border-sand-strong bg-sand text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

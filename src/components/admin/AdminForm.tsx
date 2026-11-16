"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/Field";

export type AdminFormState = { status: "idle" | "error" | "success"; message?: string; errors?: Partial<Record<string, string>> };

/**
 * Wraps server-rendered fields in a form bound to a server action, showing
 * the result and a pending state on the submit button.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className = "flex flex-col gap-6",
  multipart = false,
}: {
  action: (prev: AdminFormState, fd: FormData) => Promise<AdminFormState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  multipart?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className={className} noValidate {...(multipart ? { encType: "multipart/form-data" } : {})}>
      {state.message && <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage>}
      {state.errors && Object.keys(state.errors).length > 0 && (
        <FormMessage tone="error">
          <ul className="list-disc pl-5">
            {Object.entries(state.errors).map(([k, v]) => (
              <li key={k}>
                <strong className="capitalize">{k.replace(/_/g, " ")}</strong>: {v}
              </li>
            ))}
          </ul>
        </FormMessage>
      )}
      {children}
      <div>
        <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-forest-900 px-8 font-semibold text-cream hover:bg-forest-800 disabled:opacity-60">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

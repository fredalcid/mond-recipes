"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/ui/Field";
import { deleteAccount, type AccountState } from "../actions";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAccount, { status: "idle" });
  return (
    <form action={action} className="mt-8 flex flex-col gap-4 rounded-card border border-danger/40 bg-white p-6">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="Type DELETE to confirm" name="confirm" autoComplete="off" required error={state.errors?.confirm} />
      <div>
        <button type="submit" disabled={pending} className="min-h-12 rounded-full bg-danger px-6 font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? "Deleting…" : "Permanently delete my account"}
        </button>
      </div>
    </form>
  );
}

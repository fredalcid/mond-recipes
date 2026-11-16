"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { NOTIFICATION_PREFS } from "@/lib/community/types";
import { updateNotificationPrefs, type AccountState } from "../actions";

export function PrefsForm({ prefs }: { prefs: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateNotificationPrefs, { status: "idle" });
  return (
    <form action={action} className="mt-8 flex max-w-2xl flex-col gap-4">
      {state.message && <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage>}
      <fieldset className="flex flex-col divide-y divide-sand rounded-card border border-sand-strong bg-white">
        <legend className="sr-only">Notify me about</legend>
        {NOTIFICATION_PREFS.map(([key, label]) => (
          <label key={key} className="flex min-h-14 items-center justify-between gap-4 px-5">
            <span>{label}</span>
            <input type="checkbox" name={key} defaultChecked={prefs[key] !== false} className="h-6 w-6 accent-forest-900" />
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useId } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { CONSENT_TEXT, type NewsletterState } from "@/lib/newsletter";

const initial: NewsletterState = { status: "idle" };

export function NewsletterForm({ source, tone = "light", stacked = false }: { source: string; tone?: "light" | "dark"; stacked?: boolean }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const id = useId();
  const dark = tone === "dark";

  if (state.status === "success") {
    return (
      <p role="status" className={`rounded-xl px-4 py-3 text-sm font-medium ${dark ? "bg-forest-800 text-cream" : "bg-forest-100 text-forest-900"}`}>
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="source" value={source} />
      <div aria-hidden="true" className="hidden">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className={`flex flex-col gap-2 ${stacked ? "" : "sm:flex-row"}`}>
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={state.errors?.email ? `${id}-email-error` : undefined}
          className={`min-h-12 w-full min-w-0 flex-1 rounded-full border px-5 text-base focus:outline-none ${
            dark ? "border-forest-700 bg-forest-950/40 text-cream placeholder:text-cream/60" : "border-sand-strong bg-white text-ink placeholder:text-ink-muted/70"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-gold-500 px-6 font-semibold text-forest-950 transition-colors hover:bg-gold-600 disabled:opacity-60"
        >
          {pending ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {state.errors?.email && (
        <p id={`${id}-email-error`} className={`text-sm font-medium ${dark ? "text-gold-500" : "text-danger"}`}>
          {state.errors.email}
        </p>
      )}
      <label className={`flex items-start gap-3 text-sm ${dark ? "text-cream/90" : "text-ink-muted"}`}>
        <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-forest-900" />
        <span>{CONSENT_TEXT}</span>
      </label>
      {state.errors?.consent && (
        <p className={`text-sm font-medium ${dark ? "text-gold-500" : "text-danger"}`}>{state.errors.consent}</p>
      )}
      {state.status === "error" && state.message && (
        <p role="alert" className={`text-sm font-medium ${dark ? "text-gold-500" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

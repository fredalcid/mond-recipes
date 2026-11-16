"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { sendContactMessage, type ContactState } from "./actions";

const TOPICS: [string, string][] = [
  ["general", "General question"],
  ["recipe", "A recipe or correction"],
  ["advertising", "Advertising and partnerships"],
  ["privacy", "Privacy or my data"],
  ["copyright", "Copyright complaint"],
];

export function ContactForm({ topic }: { topic?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });
  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Field label="Your name" name="name" autoComplete="name" required error={state.errors?.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-topic" className="text-sm font-semibold">
          Topic
        </label>
        <select id="contact-topic" name="topic" defaultValue={TOPICS.some(([k]) => k === topic) ? topic : "general"} className="min-h-12 rounded-xl border border-sand-strong bg-white px-4">
          {TOPICS.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-sm font-semibold">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          aria-invalid={state.errors?.message ? true : undefined}
          className={`rounded-xl border bg-white px-4 py-3 text-base ${state.errors?.message ? "border-danger" : "border-sand-strong"}`}
        />
        {state.errors?.message && <p className="text-sm font-medium text-danger">{state.errors.message}</p>}
      </div>
      <p className="text-sm text-ink-muted">For copyright complaints, include the page address and proof that you own the work.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

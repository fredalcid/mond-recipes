"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";
import { joinAction, requestResetAction, signInAction, updatePasswordAction } from "./actions";
import { initialAuthState } from "./types";

export function JoinForm() {
  const [state, action, pending] = useActionState(joinAction, initialAuthState);
  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="Name" name="name" autoComplete="name" required error={state.errors?.name} hint="Shown on your profile and recipes." />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.password}
        hint="At least 10 characters, with a letter and a number."
      />
      <label className="flex items-start gap-3 text-sm text-ink-muted">
        <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-forest-900" />
        <span>
          I agree to the <Link href="/terms" className="font-semibold text-forest-900 underline">Terms of Service</Link> and{" "}
          <Link href="/community-guidelines" className="font-semibold text-forest-900 underline">Community Guidelines</Link>, and I have read the{" "}
          <Link href="/privacy" className="font-semibold text-forest-900 underline">Privacy Policy</Link>.
        </span>
      </label>
      {state.errors?.terms && <p className="-mt-3 text-sm font-medium text-danger">{state.errors.terms}</p>}
      <label className="flex items-start gap-3 text-sm text-ink-muted">
        <input type="checkbox" name="age" className="mt-0.5 h-5 w-5 shrink-0 accent-forest-900" />
        <span>I am 14 years old or older.</span>
      </label>
      {state.errors?.age && <p className="-mt-3 text-sm font-medium text-danger">{state.errors.age}</p>}
      <Turnstile resetKey={state} />
      <Button type="submit" disabled={pending}>{pending ? "Creating your account…" : "Create account"}</Button>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialAuthState);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state.errors?.password} />
      <div className="-mt-2 text-right text-sm">
        <Link href="/reset-password" className="font-semibold text-forest-900 underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <Turnstile resetKey={state} />
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, initialAuthState);
  if (state.status === "success") return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <Turnstile resetKey={state} />
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.password}
        hint="At least 10 characters, with a letter and a number."
      />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={state.errors?.confirm} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}

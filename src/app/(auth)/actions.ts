"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import {
  fieldErrors,
  joinSchema,
  resetRequestSchema,
  safeNextPath,
  signInSchema,
  updatePasswordSchema,
} from "@/lib/validation";
import type { AuthFormState } from "./types";

const NOT_CONFIGURED: AuthFormState = {
  status: "error",
  message: "Member accounts aren't switched on yet. Please check back soon.",
};

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : site.url;
}

export async function joinAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/account`,
      data: { display_name: parsed.data.name },
    },
  });

  // Same message whether or not the address already has an account,
  // so the form can't be used to discover who is registered.
  if (error && !/already registered/i.test(error.message)) {
    if (/password/i.test(error.message)) return { status: "error", errors: { password: error.message } };
    console.error("sign up failed", error.message);
    return { status: "error", message: "We couldn't create your account. Please try again." };
  }

  return {
    status: "success",
    message: `Check ${parsed.data.email} for a link to confirm your email. You can sign in once it's confirmed.`,
  };
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      return { status: "error", message: "Please confirm your email first. Check your inbox for the link we sent." };
    }
    return { status: "error", message: "That email and password don't match. Please try again." };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function requestResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/confirm?next=/update-password`,
  });
  if (error) console.error("reset request failed", error.message);

  return {
    status: "success",
    message: "If an account uses that email, we've sent a link to reset the password.",
  };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/update-password");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", errors: { password: error.message } };

  redirect("/account?password=updated");
}

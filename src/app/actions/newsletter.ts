"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, newsletterSchema } from "@/lib/validation";
import { CONSENT_TEXT, type NewsletterState } from "@/lib/newsletter";

/**
 * Records a newsletter sign-up as "pending" with proof of consent.
 * Nothing is sent until the person confirms by email (double opt-in, Phase 3).
 */
export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  // Honeypot: real visitors never fill this hidden field.
  if (String(formData.get("company") ?? "") !== "") return { status: "success", message: "Thanks!" };

  const parsed = newsletterSchema.safeParse({ email: formData.get("email"), consent: formData.get("consent") });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "Newsletter sign-up opens soon. Please check back after launch." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { error } = await supabase.rpc("subscribe_newsletter", {
    p_email: parsed.data.email,
    p_consent_text: CONSENT_TEXT,
    p_source: String(formData.get("source") ?? "website"),
    p_ip: ip,
  });

  if (error) {
    console.error("newsletter subscribe failed", error.message);
    return { status: "error", message: "Something went wrong. Please try again in a moment." };
  }

  return {
    status: "success",
    message: "You're on the list. We'll email you to confirm before sending any newsletter.",
  };
}

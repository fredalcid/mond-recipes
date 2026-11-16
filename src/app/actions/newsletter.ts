"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrors, newsletterSchema } from "@/lib/validation";
import { CONSENT_TEXT, type NewsletterState } from "@/lib/newsletter";
import { emailButton, emailLayout, sendEmail } from "@/lib/email";
import { site } from "@/lib/site";

/**
 * Newsletter sign-up with double opt-in:
 * 1. Record the request and proof of consent (status "pending").
 * 2. Email a confirmation link. Nothing else is ever sent until it's clicked.
 * The reply is the same whether or not the address was already subscribed.
 */
export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  // Honeypot: real visitors never fill this hidden field.
  if (String(formData.get("company") ?? "") !== "") return { status: "success", message: "Thanks! Check your inbox to confirm." };

  const parsed = newsletterSchema.safeParse({ email: formData.get("email"), consent: formData.get("consent") });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const db = createServiceClient();
  if (!db) return { status: "error", message: "Newsletter sign-up opens soon. Please check back after launch." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [byIp, byEmail] = await Promise.all([
    db.rpc("check_rate_limit", { p_key: `newsletter:ip:${ip}`, p_limit: 5, p_window_seconds: 3600 }),
    db.rpc("check_rate_limit", { p_key: `newsletter:email:${parsed.data.email}`, p_limit: 3, p_window_seconds: 86400 }),
  ]);
  if (byIp.data === false || byEmail.data === false) {
    return { status: "error", message: "Too many sign-up attempts. Please try again later." };
  }

  const { data, error } = await db.rpc("newsletter_request", {
    p_email: parsed.data.email,
    p_consent_text: CONSENT_TEXT,
    p_source: String(formData.get("source") ?? "website").slice(0, 40),
    p_ip: ip === "unknown" ? null : ip,
  });
  if (error) {
    console.error("newsletter_request failed", error.message);
    return { status: "error", message: "Something went wrong. Please try again in a moment." };
  }

  const row = (data as { confirm_token: string | null; unsubscribe_token: string | null; already_confirmed: boolean }[])[0];
  if (row && !row.already_confirmed && row.confirm_token) {
    const confirmUrl = `${site.url}/newsletter/confirm?token=${row.confirm_token}`;
    const unsubscribeUrl = `${site.url}/newsletter/unsubscribe?token=${row.unsubscribe_token}`;
    const result = await sendEmail({
      to: parsed.data.email,
      subject: "Please confirm your Mònd Recipes subscription",
      text: `Please confirm you'd like to receive the Mònd Recipes newsletter:\n${confirmUrl}\n\nIf you didn't ask for this, ignore this email and you won't hear from us.\n\nUnsubscribe: ${unsubscribeUrl}`,
      html: emailLayout(
        "Confirm your subscription",
        `<p>Thanks for signing up! Please confirm you'd like to receive the Mònd Recipes newsletter.</p>${emailButton(confirmUrl, "Yes, subscribe me")}<p style="font-size:14px;color:#56604e">If you didn't ask for this, ignore this email and you won't hear from us. The link works for 7 days.</p>`,
        `<a href="${unsubscribeUrl}" style="color:#56604e">Unsubscribe</a>`,
      ),
    });
    if (!result.sent) {
      console.error("confirmation email not sent", result.error);
      return { status: "success", message: "Thanks! We've saved your request. Confirmation emails will start shortly, and nothing will be sent until you confirm." };
    }
  }

  return { status: "success", message: "Almost done! Check your inbox and click the link to confirm your subscription." };
}

export async function confirmNewsletter(token: string): Promise<boolean> {
  const db = createServiceClient();
  if (!db || !/^[0-9a-f]{64}$/.test(token)) return false;
  const { data } = await db.rpc("newsletter_confirm", { p_token: token });
  return data === true;
}

export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const db = createServiceClient();
  if (!db || !/^[0-9a-f]{64}$/.test(token)) return false;
  const { data } = await db.rpc("newsletter_unsubscribe", { p_token: token });
  return data === true;
}

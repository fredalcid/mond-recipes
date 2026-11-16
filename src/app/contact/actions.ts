"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { emailSchema, fieldErrors } from "@/lib/validation";

export type ContactState = { status: "idle" | "success" | "error"; message?: string; errors?: Partial<Record<string, string>> };

const TOPICS = {
  general: "General question",
  recipe: "A recipe or correction",
  advertising: "Advertising and partnerships",
  privacy: "Privacy or my data",
  copyright: "Copyright complaint",
} as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  topic: z.enum(Object.keys(TOPICS) as [keyof typeof TOPICS, ...(keyof typeof TOPICS)[]]),
  message: z.string().trim().min(10, "Write a little more (at least 10 characters).").max(5000),
});

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (String(formData.get("website") ?? "") !== "") return { status: "success", message: "Thanks, your message has been sent." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const to = process.env.CONTACT_EMAIL ?? "";
  const db = createServiceClient();
  if (!to || !db) return { status: "error", message: "The contact form isn't switched on yet. Please try again soon." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await db.rpc("check_rate_limit", { p_key: `contact:${ip}`, p_limit: 5, p_window_seconds: 3600 });
  if (allowed === false) return { status: "error", message: "Too many messages. Please try again later." };

  const { name, email, topic, message } = parsed.data;
  const result = await sendEmail({
    to,
    replyTo: email,
    subject: `[Contact] ${TOPICS[topic]} from ${name}`,
    text: `From: ${name} <${email}>\nTopic: ${TOPICS[topic]}\n\n${message}`,
    html: emailLayout(
      TOPICS[topic],
      `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    ),
  });
  if (!result.sent) return { status: "error", message: "Your message couldn't be sent. Please try again in a moment." };
  return { status: "success", message: "Thanks, your message has been sent. We'll reply by email." };
}

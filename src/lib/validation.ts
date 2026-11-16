import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

/** At least 10 characters, with a letter and a number. */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use 128 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name (at least 2 characters).")
  .max(60, "Use 60 characters or fewer.")
  .regex(/^[^<>]*$/, "Names can't contain < or >.");

export const joinSchema = z
  .object({
    name: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    terms: z.literal("on", { message: "Please accept the Terms and Community Guidelines." }),
    // Quebec requires a parent's consent for children under 14; accounts are for 14 and older.
    age: z.literal("on", { message: "You must be 14 or older to create an account." }),
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal("on", { message: "Please confirm you'd like to receive the newsletter." }),
});

/** Only allow redirects to paths on this site (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || next.length > 500) return fallback;
  // Control characters and backslashes are dropped or rewritten by browsers ("/\t/evil.com" becomes
  // "//evil.com"), so they are refused outright; then the result must stay on this site.
  if (!next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const base = "https://mond.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

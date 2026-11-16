import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change", "invite"];

/**
 * Handles the links in confirmation and password-reset emails.
 * The Supabase email templates must link to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>&next=<path>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), "/account");

  const supabase = await createClient();
  if (supabase && tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const url = new URL(next, request.url);
      if (type === "signup" || type === "email") url.searchParams.set("verified", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=link", request.url));
}

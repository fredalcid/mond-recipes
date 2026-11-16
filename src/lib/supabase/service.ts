import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client. Bypasses Row Level Security, so it is used ONLY on the
 * server for narrow jobs (newsletter sign-up, rate limits, link checks).
 * SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser.
 */
export function createServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl.startsWith("https://") || key.length < 20) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

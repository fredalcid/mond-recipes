"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Browser Supabase client (singleton). Null until Supabase is configured. */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

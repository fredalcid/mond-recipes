import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { demoSource } from "./demo-source";
import { supabaseSource } from "./supabase-source";
import type { DataSource } from "./source";

/** Live database when Supabase is connected; otherwise the labelled sample library. */
export function getData(): DataSource {
  return isSupabaseConfigured() ? supabaseSource : demoSource;
}

export * from "./types";

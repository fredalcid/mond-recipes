import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { demoContent } from "./demo";
import { supabaseContent } from "./supabase";
import type { AdPlacement, ContentSource } from "./types";

export function getContent(): ContentSource {
  return isSupabaseConfigured() ? supabaseContent : demoContent;
}

/** Ad placements, read once per request. */
export const getAdPlacements = cache(async (): Promise<Record<string, AdPlacement>> => {
  try {
    return await getContent().listAdPlacements();
  } catch {
    return {};
  }
});

export * from "./types";

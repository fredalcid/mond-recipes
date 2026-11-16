import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Only real, indexable pages belong here. Recipe, country and article URLs
 * are added from the database in Phase 2–3 (empty or thin pages are excluded).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${site.url}/`, changeFrequency: "daily", priority: 1 }];
}

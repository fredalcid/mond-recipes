import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getSiteSettings();
  // Before launch (or on a staging copy) the whole site is closed to search engines.
  if (!seo.allowIndexing) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/auth", "/submit", "/update-password", "/notifications", "/go/", "/community/new"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { getData } from "@/lib/data";
import { site } from "@/lib/site";

export const revalidate = 3600;

/**
 * Only real, indexable pages: published non-sample recipes and countries that
 * editors have marked as complete. Empty or thin pages are left out.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, site.url).toString();
  const base: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/recipes"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/countries"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/drinks-tea"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/ingredients"), changeFrequency: "weekly", priority: 0.6 },
  ];
  try {
    const data = getData();
    const [recipes, countries] = await Promise.all([data.listIndexableRecipes(), data.listIndexableCountries()]);
    return [
      ...base,
      ...countries.map((c) => ({ url: url(`/countries/${c.slug}`), lastModified: c.updatedAt ?? undefined, priority: 0.7 })),
      ...recipes.map((r) => ({
        url: url(r.kind === "drink" ? `/drinks-tea/${r.slug}` : `/recipes/${r.slug}`),
        lastModified: r.updatedAt ?? undefined,
        priority: 0.8,
      })),
    ];
  } catch {
    return base;
  }
}

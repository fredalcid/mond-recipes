import type { MetadataRoute } from "next";
import { getData } from "@/lib/data";
import { getContent } from "@/lib/content";
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
    { url: url("/articles"), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/shop"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/about"), changeFrequency: "yearly", priority: 0.3 },
  ];
  try {
    const data = getData();
    const [recipes, countries, content] = await Promise.all([
      data.listIndexableRecipes(),
      data.listIndexableCountries(),
      getContent().listIndexable().catch(() => []),
    ]);
    return [
      ...base,
      ...content.map((c) => ({ url: url(c.path), lastModified: c.updatedAt ?? undefined, priority: 0.6 })),
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

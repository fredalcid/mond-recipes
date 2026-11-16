import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { getData, recipeHref, type RecipeKind } from "@/lib/data";

/** Cached per request so metadata and the page share one database read. */
export const loadRecipe = cache(async (slug: string, kind: RecipeKind) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  return getData().getRecipe(slug, kind);
});

export async function recipeMetadata(slug: string, kind: RecipeKind): Promise<Metadata> {
  const r = await loadRecipe(slug, kind);
  if (!r) return { title: "Not found", robots: { index: false } };
  const description = r.metaDescription ?? r.summary ?? undefined;
  return {
    title: r.seoTitle ?? r.title,
    description,
    alternates: { canonical: recipeHref(r) },
    // Sample recipes are never indexed.
    robots: r.isSample ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: r.title,
      description,
      images: r.imageUrl ? [{ url: r.imageUrl, alt: r.title }] : undefined,
    },
  };
}

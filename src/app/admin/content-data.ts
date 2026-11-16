import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped PostgREST rows, mapped explicitly */

export async function db() {
  // Without the database the admin layout shows a "not connected" message instead of the page.
  return (await createClient()) ?? notFound();
}

/** Published recipes and drinks, for "related recipes" pickers. */
export async function recipeOptions(): Promise<[string, string][]> {
  const { data } = await (await db()).from("recipes").select("id, title, kind").eq("status", "published").order("title").limit(1000);
  return (data ?? []).map((r: any) => [r.id, r.kind === "drink" ? `${r.title} (drink)` : r.title]);
}

export async function articleCategoryOptions(): Promise<[string, string][]> {
  const { data } = await (await db()).from("article_categories").select("slug, name").order("display_order");
  return (data ?? []).map((c: any) => [c.slug, c.name]);
}

export async function loadArticle(id: string) {
  const { data } = await (await db())
    .from("articles")
    .select("*, article_category_links ( article_categories ( slug ) ), article_recipes ( recipe_id )")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const a = data as any;
  return {
    ...a,
    categories: (a.article_category_links ?? []).map((l: any) => l.article_categories?.slug).filter(Boolean) as string[],
    recipes: (a.article_recipes ?? []).map((l: any) => l.recipe_id) as string[],
  };
}

export async function loadVideo(id: string) {
  const { data } = await (await db()).from("videos").select("*, video_recipes ( recipe_id )").eq("id", id).maybeSingle();
  if (!data) return null;
  const v = data as any;
  return { ...v, recipes: (v.video_recipes ?? []).map((l: any) => l.recipe_id) as string[] };
}

export async function loadProduct(id: string) {
  const { data } = await (await db()).from("products").select("*, product_categories ( slug )").eq("id", id).maybeSingle();
  if (!data) return null;
  const p = data as any;
  return { ...p, category: p.product_categories?.slug ?? "" };
}

export async function shopOptions() {
  const client = await db();
  const [cats, rets] = await Promise.all([
    client.from("product_categories").select("slug, name").order("display_order"),
    client.from("retailers").select("id, name, is_active").order("name"),
  ]);
  return {
    categories: [["", "No category"], ...(cats.data ?? []).map((c: any) => [c.slug, c.name])] as [string, string][],
    retailers: [["", "No retailer"], ...(rets.data ?? []).map((r: any) => [String(r.id), r.is_active ? r.name : `${r.name} (inactive)`])] as [string, string][],
  };
}

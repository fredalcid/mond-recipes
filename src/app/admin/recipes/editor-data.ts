import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EditorOptions } from "@/components/admin/RecipeEditor";

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped PostgREST rows, mapped explicitly */

export async function loadEditorOptions(): Promise<EditorOptions> {
  const supabase = (await createClient()) ?? notFound();
  const [countries, cuisines, cats, diets, allergens, drinks, ings] = await Promise.all([
    supabase.from("countries").select("slug, name, regions ( slug, name )").order("name"),
    supabase.from("cuisines").select("name").order("name"),
    supabase.from("categories").select("slug, name").order("display_order"),
    supabase.from("dietary_tags").select("slug, name").order("name"),
    supabase.from("allergens").select("slug, name").order("name"),
    supabase.from("drink_categories").select("slug, name").order("display_order"),
    supabase.from("ingredients").select("name").order("name").limit(5000),
  ]);
  return {
    countries: ((countries.data ?? []) as any[]).map((c) => ({ slug: c.slug, name: c.name, regions: c.regions ?? [] })),
    cuisines: (cuisines.data ?? []).map((c: any) => c.name),
    categories: cats.data ?? [],
    diets: diets.data ?? [],
    allergens: allergens.data ?? [],
    drinkCategories: drinks.data ?? [],
    ingredientNames: (ings.data ?? []).map((i: any) => i.name),
  };
}

export async function loadRecipeForEditing(id: string) {
  const supabase = (await createClient()) ?? notFound();
  const { data, error } = await supabase
    .from("recipes")
    .select(`*, recipe_ingredients ( position, quantity, unit, note, group_label, ingredients ( name ) ),
      recipe_steps ( position, body, timer_seconds ), recipe_countries ( countries ( slug ) ), recipe_regions ( regions ( slug ) ),
      recipe_cuisines ( cuisines ( name ) ), recipe_categories ( categories ( slug ) ), recipe_dietary_tags ( dietary_tags ( slug ) ),
      recipe_allergens ( allergens ( slug ) ), drink_categories ( slug ), recipe_sources ( source_type, description, url )`)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as any;
  const slugs = (rows: any[] | null, key: string) => (rows ?? []).map((x) => x[key]?.slug).filter(Boolean);
  const src = r.recipe_sources?.[0];
  return {
    hero_image_path: r.hero_image_path as string | null,
    og_image_path: r.og_image_path as string | null,
    value: {
      id: r.id,
      kind: r.kind,
      title: r.title,
      slug: r.slug,
      summary: r.summary ?? "",
      status: r.status === "removed" ? "unpublished" : r.status,
      verification: r.verification,
      verificationConfirmed: r.verification === "test_kitchen",
      prep_minutes: r.prep_minutes ?? "",
      cook_minutes: r.cook_minutes ?? "",
      servings: r.servings ?? "",
      serving_unit: r.serving_unit ?? "",
      difficulty: r.difficulty ?? "",
      tips: r.tips ?? "",
      substitutions: r.substitutions ?? "",
      drink_category: r.drink_categories?.slug ?? "",
      alcohol_percent: r.alcohol_percent ?? "",
      hero_image_path: "",
      remove_image: false,
      seo_title: r.seo_title ?? "",
      meta_description: r.meta_description ?? "",
      canonical_url: r.canonical_url ?? "",
      noindex: Boolean(r.noindex),
      remove_og_image: false,
      countries: slugs(r.recipe_countries, "countries"),
      regions: slugs(r.recipe_regions, "regions"),
      cuisines: (r.recipe_cuisines ?? []).map((x: any) => x.cuisines?.name).filter(Boolean),
      categories: slugs(r.recipe_categories, "categories"),
      diets: slugs(r.recipe_dietary_tags, "dietary_tags"),
      allergens: slugs(r.recipe_allergens, "allergens"),
      ingredients: [...(r.recipe_ingredients ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ name: i.ingredients?.name ?? "", quantity: i.quantity == null ? "" : String(Number(i.quantity)), unit: i.unit ?? "", note: i.note ?? "", group: i.group_label ?? "" })),
      steps: [...(r.recipe_steps ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ body: s.body, timer_minutes: s.timer_seconds ? String(Math.round((s.timer_seconds / 60) * 100) / 100) : "" })),
      source: { type: src?.source_type ?? "", description: src?.description ?? "", url: src?.url ?? "" },
    },
  };
}

import "server-only";
import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { DataSource } from "./source";
import {
  PAGE_SIZE,
  type CountryDetail,
  type Difficulty,
  type RecipeDetail,
  type RecipeKind,
  type RecipeSummary,
  type SearchParams,
  type Verification,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from PostgREST without generated types; each is mapped explicitly below. */

/**
 * Public content is read with the anonymous key (no cookies), so pages can be
 * cached and Row Level Security only ever returns published content.
 */
let anon: SupabaseClient | null = null;
/** Cookie-free client for public, cacheable reads. */
export function publicClient(): SupabaseClient {
  return db();
}

function db(): SupabaseClient {
  anon ??= createSupabase(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return anon;
}

export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${supabaseUrl}/storage/v1/object/public/recipe-images/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function mapSearchRow(r: any): RecipeSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    kind: r.kind,
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    totalMinutes: r.total_minutes ?? 0,
    difficulty: r.difficulty,
    imageUrl: publicImageUrl(r.hero_image_path),
    ratingAverage: r.rating_average == null ? null : Number(r.rating_average),
    ratingCount: r.rating_count ?? 0,
    saveCount: r.save_count ?? 0,
    verification: r.verification as Verification,
    isSample: Boolean(r.is_sample),
    cuisines: r.cuisines ?? [],
    countries: (r.countries ?? []).map((name: string, i: number) => ({ name, iso2: (r.country_codes ?? [])[i] ?? "" })),
  };
}

async function rpcSearch(p: SearchParams, limit = PAGE_SIZE) {
  const page = Math.max(1, p.page ?? 1);
  const { data, error } = await db().rpc("search_recipes", {
    p_q: p.q ?? null,
    p_kind: p.kind ?? null,
    p_country: p.country ?? null,
    p_region: p.region ?? null,
    p_cuisine: p.cuisine ?? null,
    p_category: p.category ?? null,
    p_diet: p.diet ?? null,
    p_drink_category: p.drinkCategory ?? null,
    p_max_minutes: p.maxMinutes ?? null,
    p_difficulty: p.difficulty ?? null,
    p_min_rating: p.minRating ?? null,
    p_sort: p.sort ?? "relevance",
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });
  fail(error, "search_recipes");
  const rows = (data ?? []) as any[];
  return { items: rows.map(mapSearchRow), total: Number(rows[0]?.total_count ?? 0), page, pageSize: limit };
}

const RECIPE_SELECT = `
  id, slug, title, summary, kind, prep_minutes, cook_minutes, total_minutes, servings, serving_unit, difficulty,
  tips, substitutions, hero_image_path, alcohol_percent, rating_average, rating_count, save_count, verification,
  is_sample, published_at, updated_at, seo_title, meta_description, canonical_url, noindex, og_image_path,
  recipe_ingredients ( position, quantity, unit, note, group_label, ingredients ( name, grams_per_cup ) ),
  recipe_steps ( position, body, timer_seconds ),
  recipe_countries ( countries ( name, slug, iso2 ) ),
  recipe_regions ( regions ( name, slug, countries ( slug ) ) ),
  recipe_cuisines ( cuisines ( name, slug ) ),
  recipe_categories ( categories ( name, slug ) ),
  recipe_dietary_tags ( dietary_tags ( name, slug ) ),
  recipe_allergens ( allergens ( name, slug ) ),
  drink_categories ( name, slug, is_alcoholic ),
  author:profiles ( id, display_name, username ),
  recipe_sources ( source_type, description, url )
`;

function mapDetail(r: any): RecipeDetail {
  const countries = (r.recipe_countries ?? []).map((x: any) => x.countries).filter(Boolean);
  const cuisines = (r.recipe_cuisines ?? []).map((x: any) => x.cuisines).filter(Boolean);
  const pick = (rows: any[] | null, key: string) =>
    (rows ?? []).map((x: any) => x[key]).filter(Boolean).map((o: any) => ({ name: o.name, slug: o.slug }));
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    kind: r.kind as RecipeKind,
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    totalMinutes: r.total_minutes ?? 0,
    difficulty: r.difficulty as Difficulty | null,
    imageUrl: publicImageUrl(r.hero_image_path),
    ratingAverage: r.rating_average == null ? null : Number(r.rating_average),
    ratingCount: r.rating_count ?? 0,
    saveCount: r.save_count ?? 0,
    verification: r.verification,
    isSample: Boolean(r.is_sample),
    cuisines: cuisines.map((c: any) => c.name),
    countries: countries.map((c: any) => ({ name: c.name, iso2: c.iso2 })),
    servings: r.servings,
    servingUnit: r.serving_unit,
    tips: r.tips,
    substitutions: r.substitutions,
    ingredients: [...(r.recipe_ingredients ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((i: any) => ({
        quantity: i.quantity == null ? null : Number(i.quantity),
        unit: i.unit,
        name: i.ingredients?.name ?? "",
        note: i.note,
        group: i.group_label,
        gramsPerCup: i.ingredients?.grams_per_cup == null ? null : Number(i.ingredients.grams_per_cup),
      })),
    steps: [...(r.recipe_steps ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((s: any) => ({ position: s.position, body: s.body, timerSeconds: s.timer_seconds })),
    countryLinks: countries.map((c: any) => ({ name: c.name, slug: c.slug, iso2: c.iso2 })),
    regions: (r.recipe_regions ?? [])
      .map((x: any) => x.regions)
      .filter(Boolean)
      .map((g: any) => ({ name: g.name, slug: g.slug, countrySlug: g.countries?.slug ?? "" })),
    cuisineLinks: cuisines.map((c: any) => ({ name: c.name, slug: c.slug })),
    categories: pick(r.recipe_categories, "categories"),
    diets: pick(r.recipe_dietary_tags, "dietary_tags"),
    allergens: pick(r.recipe_allergens, "allergens"),
    drinkCategory: r.drink_categories
      ? { name: r.drink_categories.name, slug: r.drink_categories.slug, isAlcoholic: r.drink_categories.is_alcoholic }
      : null,
    alcoholPercent: r.alcohol_percent == null ? null : Number(r.alcohol_percent),
    author: r.author ? { id: r.author.id, displayName: r.author.display_name, username: r.author.username } : null,
    sources: (r.recipe_sources ?? []).map((s: any) => ({ type: s.source_type, description: s.description, url: s.url })),
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    seoTitle: r.seo_title,
    metaDescription: r.meta_description,
    canonicalUrl: r.canonical_url,
    noindex: Boolean(r.noindex),
    ogImageUrl: publicImageUrl(r.og_image_path),
  };
}

export const supabaseSource: DataSource = {
  mode: "live",

  searchRecipes: (p) => rpcSearch(p),

  async getRecipe(slug, kind) {
    const { data, error } = await db()
      .from("recipes")
      .select(RECIPE_SELECT)
      .eq("slug", slug)
      .eq("kind", kind)
      .eq("status", "published")
      .maybeSingle();
    fail(error, "getRecipe");
    return data ? mapDetail(data) : null;
  },

  async getRelated(recipe, limit = 4) {
    const seen = new Set([recipe.slug]);
    const out: RecipeSummary[] = [];
    const tries: SearchParams[] = [
      ...recipe.countryLinks.map((c) => ({ country: c.slug })),
      ...recipe.cuisineLinks.map((c) => ({ cuisine: c.slug })),
      ...recipe.categories.slice(0, 2).map((c) => ({ category: c.slug })),
    ];
    for (const t of tries) {
      if (out.length >= limit) break;
      const res = await rpcSearch({ ...t, kind: recipe.kind, sort: "popular" }, limit + 1);
      for (const r of res.items) {
        if (seen.has(r.slug) || out.length >= limit) continue;
        seen.add(r.slug);
        out.push(r);
      }
    }
    return out;
  },

  async getFilterOptions() {
    const [cats, diets, drinks, cuisines, used] = await Promise.all([
      db().from("categories").select("slug, name").order("display_order"),
      db().from("dietary_tags").select("slug, name").order("name"),
      db().from("drink_categories").select("slug, name").order("display_order"),
      db().from("cuisines").select("slug, name").order("name"),
      db().from("recipe_countries").select("countries ( slug, name )"),
    ]);
    for (const r of [cats, diets, drinks, cuisines, used]) fail(r.error, "getFilterOptions");
    const countries = new Map<string, string>();
    for (const row of (used.data ?? []) as any[]) if (row.countries) countries.set(row.countries.slug, row.countries.name);
    return {
      categories: cats.data ?? [],
      diets: diets.data ?? [],
      drinkCategories: drinks.data ?? [],
      cuisines: cuisines.data ?? [],
      countries: [...countries].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  },

  async listCountries() {
    const { data, error } = await db()
      .from("countries")
      .select("slug, name, iso2, intro, is_featured, hero_image_path, flag_path, recipe_countries ( count )")
      .order("name");
    fail(error, "listCountries");
    return ((data ?? []) as any[]).map((c) => ({
      slug: c.slug,
      name: c.name,
      iso2: c.iso2,
      intro: c.intro,
      isFeatured: c.is_featured,
      recipeCount: c.recipe_countries?.[0]?.count ?? 0,
      imageUrl: publicImageUrl(c.hero_image_path),
      flagUrl: publicImageUrl(c.flag_path),
    }));
  },

  async getCountry(slug): Promise<CountryDetail | null> {
    const { data: c, error } = await db()
      .from("countries")
      .select(
        `id, slug, name, iso2, intro, food_culture, is_featured, is_indexable, hero_image_path, flag_path, og_image_path, canonical_url, seo_title, meta_description,
         regions ( slug, name, description, display_order ), country_aliases ( alias ), country_cuisines ( cuisines ( name ) ),
         country_featured_recipes ( position, recipes ( id, slug, title, summary, kind, prep_minutes, cook_minutes, total_minutes, difficulty, hero_image_path,
           rating_average, rating_count, save_count, verification, is_sample, status, recipe_countries ( countries ( name, iso2 ) ) ) )`,
      )
      .eq("slug", slug)
      .maybeSingle();
    fail(error, "getCountry");
    if (!c) return null;
    const [dishes, drinks] = await Promise.all([
      rpcSearch({ country: slug, kind: "food", sort: "popular" }, 24),
      rpcSearch({ country: slug, kind: "drink", sort: "popular" }, 12),
    ]);
    const row = c as any;
    return {
      slug: row.slug,
      name: row.name,
      iso2: row.iso2,
      intro: row.intro,
      isFeatured: row.is_featured,
      recipeCount: dishes.total + drinks.total,
      imageUrl: publicImageUrl(row.hero_image_path),
      foodCulture: row.food_culture,
      isIndexable: row.is_indexable,
      regions: [...(row.regions ?? [])].sort((a: any, b: any) => a.display_order - b.display_order || a.name.localeCompare(b.name)),
      aliases: (row.country_aliases ?? []).map((a: any) => a.alias),
      dishes: dishes.items,
      drinks: drinks.items,
      cuisines: [...new Set([...(row.country_cuisines ?? []).map((x: any) => x.cuisines?.name).filter(Boolean), ...[...dishes.items, ...drinks.items].flatMap((r) => r.cuisines)])],
      featured: [...(row.country_featured_recipes ?? [])]
        .filter((f: any) => f.recipes?.status === "published")
        .sort((a: any, b: any) => a.position - b.position)
        .map((f: any) => {
          const cs = (f.recipes.recipe_countries ?? []).map((x: any) => x.countries).filter(Boolean);
          return mapSearchRow({ ...f.recipes, cuisines: [], countries: cs.map((x: any) => x.name), country_codes: cs.map((x: any) => x.iso2) });
        }),
      flagUrl: publicImageUrl(row.flag_path),
      seoTitle: row.seo_title,
      metaDescription: row.meta_description,
      canonicalUrl: row.canonical_url,
      ogImageUrl: publicImageUrl(row.og_image_path),
    };
  },

  async getRegion(countrySlug, regionSlug) {
    const { data, error } = await db()
      .from("regions")
      .select("slug, name, description, countries!inner ( slug, name, iso2 )")
      .eq("slug", regionSlug)
      .eq("countries.slug", countrySlug)
      .maybeSingle();
    fail(error, "getRegion");
    if (!data) return null;
    const row = data as any;
    const recipes = await rpcSearch({ region: regionSlug, country: countrySlug, sort: "popular" }, 48);
    return { slug: row.slug, name: row.name, description: row.description, country: row.countries, recipes: recipes.items };
  },

  async listIngredients() {
    const { data, error } = await db().from("recipe_ingredients").select("ingredients ( id, slug, name )");
    fail(error, "listIngredients");
    const map = new Map<number, { id: number; slug: string; name: string }>();
    for (const row of (data ?? []) as any[]) if (row.ingredients) map.set(row.ingredients.id, row.ingredients);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  async matchByIngredients(ids, kind) {
    const { data, error } = await db().rpc("match_recipes_by_ingredients", {
      p_ingredient_ids: ids,
      p_kind: kind ?? null,
      p_limit: 24,
    });
    fail(error, "match_recipes_by_ingredients");
    return ((data ?? []) as any[]).map((r) => ({
      recipe: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        kind: r.kind,
        totalMinutes: r.total_minutes ?? 0,
        difficulty: r.difficulty,
        imageUrl: publicImageUrl(r.hero_image_path),
        isSample: Boolean(r.is_sample),
        cuisines: r.cuisines ?? [],
      },
      matched: r.matched_count,
      total: r.ingredient_count,
      missing: r.missing ?? [],
    }));
  },

  async suggest(q) {
    const { data, error } = await db().rpc("search_suggestions", { p_q: q });
    fail(error, "search_suggestions");
    return ((data ?? []) as any[]).map((s) => ({ kind: s.kind, label: s.label, slug: s.slug }));
  },

  async listIndexableRecipes() {
    const { data, error } = await db()
      .from("recipes")
      .select("slug, kind, updated_at")
      .eq("status", "published")
      .eq("is_sample", false)
      .eq("noindex", false)
      .limit(45000);
    fail(error, "listIndexableRecipes");
    return ((data ?? []) as any[]).map((r) => ({ slug: r.slug, kind: r.kind, updatedAt: r.updated_at }));
  },

  async listIndexableCountries() {
    const { data, error } = await db().from("countries").select("slug, updated_at").eq("is_indexable", true);
    fail(error, "listIndexableCountries");
    return ((data ?? []) as any[]).map((c) => ({ slug: c.slug, updatedAt: c.updated_at }));
  },
};

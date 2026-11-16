import { countries, cuisines, ingredients, recipes, type LibRecipe } from "@/lib/demo/library";
import { allergenList, categoryList, dietList, drinkCategoryList } from "@/lib/demo/taxonomy";
import type { DataSource } from "./source";
import {
  PAGE_SIZE,
  type CountryDetail,
  type CountrySummary,
  type IngredientMatch,
  type RecipeDetail,
  type RecipeSummary,
  type SearchParams,
} from "./types";

/**
 * Offline data source built from the sample library. Used when Supabase is not
 * connected, so the site can be reviewed and tested. It follows the same rules
 * as the database search (filters combine with AND, accents ignored).
 */

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
const ingredientBySlug = new Map(ingredients.map((i, idx) => [i.slug, { ...i, id: idx + 1 }]));
const countryBySlug = new Map(countries.map((c) => [c.slug, c]));
const cuisineBySlug = new Map(cuisines.map((c) => [c.slug, c]));
const opt = (list: { slug: string; name: string }[], slug: string) => list.find((o) => o.slug === slug)!;
// Stable fake publish dates so "newest" sorting is predictable.
const publishedAt = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString();

function summary(r: LibRecipe): RecipeSummary {
  return {
    id: `sample-${r.slug}`,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    kind: r.kind,
    prepMinutes: r.prep,
    cookMinutes: r.cook,
    totalMinutes: r.prep + r.cook,
    difficulty: r.difficulty,
    imageUrl: null,
    ratingAverage: null,
    ratingCount: 0,
    saveCount: 0,
    verification: "community",
    isSample: true,
    cuisines: r.cuisines.map((c) => cuisineBySlug.get(c)!.name),
    countries: r.countries.map((c) => ({ name: countryBySlug.get(c)!.name, iso2: countryBySlug.get(c)!.iso2 })),
  };
}

function detail(r: LibRecipe): RecipeDetail {
  const dc = r.drinkCategory ? drinkCategoryList.find((d) => d.slug === r.drinkCategory)! : null;
  return {
    ...summary(r),
    servings: r.servings,
    servingUnit: r.servingUnit ?? null,
    tips: r.tips ?? null,
    substitutions: r.substitutions ?? null,
    ingredients: r.ingredients.map(([quantity, unit, slug, note, group]) => {
      const ing = ingredientBySlug.get(slug)!;
      return { quantity, unit, name: ing.name, note: note ?? null, group: group ?? null, gramsPerCup: ing.gramsPerCup ?? null };
    }),
    steps: r.steps.map(([body, timer], i) => ({ position: i + 1, body, timerSeconds: timer ?? null })),
    countryLinks: r.countries.map((c) => {
      const k = countryBySlug.get(c)!;
      return { name: k.name, slug: k.slug, iso2: k.iso2 };
    }),
    regions: (r.regions ?? []).flatMap((slug) =>
      countries.flatMap((c) => (c.regions ?? []).filter((g) => g.slug === slug).map((g) => ({ name: g.name, slug: g.slug, countrySlug: c.slug }))),
    ),
    cuisineLinks: r.cuisines.map((c) => cuisineBySlug.get(c)!),
    categories: (r.categories ?? []).map((c) => opt(categoryList, c)),
    diets: (r.diets ?? []).map((d) => opt(dietList, d)),
    allergens: (r.allergens ?? []).map((a) => opt(allergenList, a)),
    drinkCategory: dc ? { name: dc.name, slug: dc.slug, isAlcoholic: dc.isAlcoholic } : null,
    alcoholPercent: null,
    author: null,
    sources: [{ type: "original", description: "Sample recipe for design review", url: null }],
    publishedAt: publishedAt(recipes.indexOf(r)),
    updatedAt: null,
    seoTitle: null,
    metaDescription: null,
  };
}

/** Trigram similarity, like PostgreSQL's pg_trgm, so typos still find recipes. */
function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (const word of s.split(/[^a-z0-9]+/).filter(Boolean)) {
    const w = `  ${word} `;
    for (let i = 0; i < w.length - 2; i++) out.add(w.slice(i, i + 3));
  }
  return out;
}
export function similarity(a: string, b: string): number {
  const x = trigrams(fold(a));
  const y = trigrams(fold(b));
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

function matchesText(r: LibRecipe, q: string): number {
  const query = fold(q);
  if (!query) return 1;
  const title = fold(r.title);
  const words = query.split(/\s+/).filter(Boolean);
  let score = 0;
  if (title.includes(query)) score += 2;
  if (words.every((w) => title.includes(w) || fold(r.summary).includes(w))) score += 1;
  const ingHit = r.ingredients.some(([, , slug]) => {
    const ing = ingredientBySlug.get(slug)!;
    return [ing.name, ...(ing.aliases ?? [])].some((n) => fold(n) === query || fold(n).startsWith(query));
  });
  if (ingHit) score += 0.5;
  const sim = similarity(r.title, query);
  if (sim > 0.3) score += sim;
  return score;
}

export const demoSource: DataSource = {
  mode: "sample",

  async searchRecipes(p: SearchParams) {
    const page = Math.max(1, p.page ?? 1);
    let list = recipes
      .map((r, i) => ({ r, i, score: p.q ? matchesText(r, p.q) : 1 }))
      .filter(({ r, score }) =>
        score > 0 &&
        (!p.kind || r.kind === p.kind) &&
        (!p.country || r.countries.includes(p.country)) &&
        (!p.region || (r.regions ?? []).includes(p.region)) &&
        (!p.cuisine || r.cuisines.includes(p.cuisine)) &&
        (!p.category || (r.categories ?? []).includes(p.category)) &&
        (!p.diet || (r.diets ?? []).includes(p.diet)) &&
        (!p.drinkCategory || r.drinkCategory === p.drinkCategory) &&
        (!p.maxMinutes || r.prep + r.cook <= p.maxMinutes) &&
        (!p.difficulty || r.difficulty === p.difficulty) &&
        // Sample recipes have no ratings, so a minimum-rating filter matches nothing.
        !p.minRating,
      );
    if (p.sort === "newest") list = list.sort((a, b) => b.i - a.i);
    else if (p.sort === "relevance" || !p.sort) list = list.sort((a, b) => b.score - a.score || b.i - a.i);
    else list = list.sort((a, b) => b.i - a.i);
    const total = list.length;
    const items = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ r }) => summary(r));
    return { items, total, page, pageSize: PAGE_SIZE };
  },

  async getRecipe(slug, kind) {
    const r = recipes.find((x) => x.slug === slug && x.kind === kind);
    return r ? detail(r) : null;
  },

  async getRelated(recipe, limit = 4) {
    const self = recipes.find((r) => r.slug === recipe.slug)!;
    const scored = recipes
      .filter((r) => r.slug !== recipe.slug && r.kind === recipe.kind)
      .map((r) => ({
        r,
        s:
          r.countries.filter((c) => self.countries.includes(c)).length * 3 +
          r.cuisines.filter((c) => self.cuisines.includes(c)).length * 2 +
          (r.categories ?? []).filter((c) => (self.categories ?? []).includes(c)).length,
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, limit).map((x) => summary(x.r));
  },

  async getFilterOptions() {
    const used = (pick: (r: LibRecipe) => string[]) => new Set(recipes.flatMap(pick));
    const countrySlugs = used((r) => r.countries);
    return {
      countries: countries.filter((c) => countrySlugs.has(c.slug)).map(({ slug, name }) => ({ slug, name })).sort(byName),
      cuisines: [...cuisines].sort(byName),
      categories: categoryList,
      diets: dietList,
      drinkCategories: drinkCategoryList.map(({ slug, name }) => ({ slug, name })),
    };
  },

  async listCountries(): Promise<CountrySummary[]> {
    return countries
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        iso2: c.iso2,
        intro: c.intro,
        isFeatured: Boolean(c.isFeatured),
        recipeCount: recipes.filter((r) => r.countries.includes(c.slug)).length,
        imageUrl: null,
      }))
      .sort(byName);
  },

  async getCountry(slug): Promise<CountryDetail | null> {
    const c = countryBySlug.get(slug);
    if (!c) return null;
    const mine = recipes.filter((r) => r.countries.includes(slug));
    return {
      slug: c.slug,
      name: c.name,
      iso2: c.iso2,
      intro: c.intro,
      isFeatured: Boolean(c.isFeatured),
      recipeCount: mine.length,
      imageUrl: null,
      foodCulture: c.foodCulture ?? null,
      // Sample content is never indexed by search engines.
      isIndexable: false,
      regions: (c.regions ?? []).map((g) => ({ ...g })),
      aliases: c.aliases ?? [],
      dishes: mine.filter((r) => r.kind === "food").map(summary),
      drinks: mine.filter((r) => r.kind === "drink").map(summary),
      cuisines: [...new Set(mine.flatMap((r) => r.cuisines.map((x) => cuisineBySlug.get(x)!.name)))],
      seoTitle: null,
      metaDescription: null,
    };
  },

  async getRegion(countrySlug, regionSlug) {
    const c = countryBySlug.get(countrySlug);
    const g = c?.regions?.find((x) => x.slug === regionSlug);
    if (!c || !g) return null;
    return {
      ...g,
      country: { slug: c.slug, name: c.name, iso2: c.iso2 },
      recipes: recipes.filter((r) => (r.regions ?? []).includes(regionSlug)).map(summary),
    };
  },

  async listIngredients() {
    const used = new Set(recipes.flatMap((r) => r.ingredients.map(([, , s]) => s)));
    return [...ingredientBySlug.values()]
      .filter((i) => used.has(i.slug))
      .map(({ id, slug, name }) => ({ id, slug, name }))
      .sort(byName);
  },

  async matchByIngredients(ids, kind) {
    const chosen = new Set(ids);
    const out: IngredientMatch[] = [];
    for (const r of recipes) {
      if (kind && r.kind !== kind) continue;
      const rIngs = [...new Set(r.ingredients.map(([, , s]) => ingredientBySlug.get(s)!))];
      const matched = rIngs.filter((i) => chosen.has(i.id)).length;
      if (!matched) continue;
      const s = summary(r);
      out.push({
        recipe: { id: s.id, slug: s.slug, title: s.title, kind: s.kind, totalMinutes: s.totalMinutes, difficulty: s.difficulty, imageUrl: null, isSample: true, cuisines: s.cuisines },
        matched,
        total: rIngs.length,
        missing: rIngs.filter((i) => !chosen.has(i.id)).map((i) => i.name).sort(),
      });
    }
    return out.sort((a, b) => b.matched - a.matched || a.total - a.matched - (b.total - b.matched) || a.recipe.title.localeCompare(b.recipe.title)).slice(0, 24);
  },

  async suggest(q) {
    const v = fold(q);
    if (v.length < 2) return [];
    return [
      ...recipes.filter((r) => fold(r.title).includes(v)).slice(0, 5).map((r) => ({ kind: r.kind === "drink" ? ("drink" as const) : ("recipe" as const), label: r.title, slug: r.slug })),
      ...[...ingredientBySlug.values()].filter((i) => fold(i.name).startsWith(v)).slice(0, 4).map((i) => ({ kind: "ingredient" as const, label: i.name, slug: i.slug })),
      ...countries
        .filter((c) => fold(c.name).startsWith(v) || (c.aliases ?? []).some((a) => fold(a).startsWith(v)))
        .slice(0, 4)
        .map((c) => ({ kind: "country" as const, label: c.name, slug: c.slug })),
    ];
  },

  async listIndexableRecipes() {
    return [];
  },

  async listIndexableCountries() {
    return [];
  },
};


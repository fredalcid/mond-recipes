export type RecipeKind = "food" | "drink";
export type Difficulty = "easy" | "medium" | "hard";
export type Verification = "community" | "editorial" | "test_kitchen";
export type SortOption = "relevance" | "rating" | "newest" | "popular";

export type RecipeSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: RecipeKind;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  saveCount: number;
  verification: Verification;
  isSample: boolean;
  cuisines: string[];
  countries: { name: string; iso2: string }[];
};

export type RecipeIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  group: string | null;
  gramsPerCup: number | null;
};

export type RecipeDetail = RecipeSummary & {
  servings: number | null;
  servingUnit: string | null;
  tips: string | null;
  substitutions: string | null;
  ingredients: RecipeIngredient[];
  steps: { position: number; body: string; timerSeconds: number | null }[];
  countryLinks: { name: string; slug: string; iso2: string }[];
  regions: { name: string; slug: string; countrySlug: string }[];
  cuisineLinks: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  diets: { name: string; slug: string }[];
  allergens: { name: string; slug: string }[];
  drinkCategory: { name: string; slug: string; isAlcoholic: boolean } | null;
  alcoholPercent: number | null;
  author: { displayName: string; username: string | null } | null;
  sources: { type: string; description: string | null; url: string | null }[];
  publishedAt: string | null;
  updatedAt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
};

export type SearchParams = {
  q?: string;
  kind?: RecipeKind;
  country?: string;
  region?: string;
  cuisine?: string;
  category?: string;
  diet?: string;
  drinkCategory?: string;
  maxMinutes?: number;
  difficulty?: Difficulty;
  minRating?: number;
  sort?: SortOption;
  page?: number;
};

export type SearchResult = { items: RecipeSummary[]; total: number; page: number; pageSize: number };

export type Option = { slug: string; name: string };

export type FilterOptions = {
  countries: Option[];
  cuisines: Option[];
  categories: Option[];
  diets: Option[];
  drinkCategories: Option[];
};

export type CountrySummary = {
  slug: string;
  name: string;
  iso2: string;
  intro: string | null;
  isFeatured: boolean;
  recipeCount: number;
  imageUrl: string | null;
};

export type Region = { slug: string; name: string; description: string | null };

export type CountryDetail = CountrySummary & {
  foodCulture: string | null;
  isIndexable: boolean;
  regions: Region[];
  aliases: string[];
  dishes: RecipeSummary[];
  drinks: RecipeSummary[];
  cuisines: string[];
  seoTitle: string | null;
  metaDescription: string | null;
};

export type RegionDetail = Region & { country: { slug: string; name: string; iso2: string }; recipes: RecipeSummary[] };

export type IngredientOption = { id: number; slug: string; name: string };

export type IngredientMatch = {
  recipe: Pick<RecipeSummary, "id" | "slug" | "title" | "kind" | "totalMinutes" | "difficulty" | "imageUrl" | "isSample" | "cuisines">;
  matched: number;
  total: number;
  missing: string[];
};

export type Suggestion = { kind: "recipe" | "drink" | "ingredient" | "country"; label: string; slug: string };

export const PAGE_SIZE = 12;

/** Where a recipe lives on the site. */
export function recipeHref(r: { slug: string; kind: RecipeKind }) {
  return r.kind === "drink" ? `/drinks-tea/${r.slug}` : `/recipes/${r.slug}`;
}

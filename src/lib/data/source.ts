import type {
  CountryDetail,
  CountrySummary,
  FilterOptions,
  IngredientMatch,
  IngredientOption,
  RecipeDetail,
  RecipeKind,
  RecipeSummary,
  RegionDetail,
  SearchParams,
  SearchResult,
  Suggestion,
} from "./types";

/** One interface, two implementations: Supabase (live) and the offline sample library. */
export interface DataSource {
  readonly mode: "live" | "sample";
  searchRecipes(params: SearchParams): Promise<SearchResult>;
  getRecipe(slug: string, kind: RecipeKind): Promise<RecipeDetail | null>;
  getRelated(recipe: RecipeDetail, limit?: number): Promise<RecipeSummary[]>;
  getFilterOptions(): Promise<FilterOptions>;
  listCountries(): Promise<CountrySummary[]>;
  getCountry(slug: string): Promise<CountryDetail | null>;
  getRegion(countrySlug: string, regionSlug: string): Promise<RegionDetail | null>;
  listIngredients(): Promise<IngredientOption[]>;
  matchByIngredients(ids: number[], kind?: RecipeKind): Promise<IngredientMatch[]>;
  suggest(q: string): Promise<Suggestion[]>;
  /** Published recipe slugs for the sitemap (sample recipes excluded). */
  listIndexableRecipes(): Promise<{ slug: string; kind: RecipeKind; updatedAt: string | null }[]>;
  listIndexableCountries(): Promise<{ slug: string; updatedAt: string | null }[]>;
}

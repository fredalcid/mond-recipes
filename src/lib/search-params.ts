import type { Difficulty, SearchParams, SortOption } from "@/lib/data/types";

type Raw = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const slug = (v: string | string[] | undefined) => {
  const s = one(v)?.trim().toLowerCase();
  return s && s.length <= 60 && SLUG.test(s) ? s : undefined;
};

export const TIME_OPTIONS = [15, 30, 45, 60, 90] as const;
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
];

/** Turns untrusted URL query parameters into a validated search. */
export function parseSearchParams(raw: Raw, fixed: Partial<SearchParams> = {}): SearchParams {
  const q = one(raw.q)?.trim().slice(0, 100) || undefined;
  const max = Number(one(raw.time));
  const rating = Number(one(raw.rating));
  const page = Number(one(raw.page));
  const difficulty = one(raw.difficulty);
  const sort = one(raw.sort);
  return {
    q,
    country: slug(raw.country),
    region: slug(raw.region),
    cuisine: slug(raw.cuisine),
    category: slug(raw.category),
    diet: slug(raw.diet),
    drinkCategory: slug(raw.type),
    maxMinutes: (TIME_OPTIONS as readonly number[]).includes(max) ? max : undefined,
    difficulty: ["easy", "medium", "hard"].includes(difficulty ?? "") ? (difficulty as Difficulty) : undefined,
    minRating: [3, 4, 4.5].includes(rating) ? rating : undefined,
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? (sort as SortOption) : q ? "relevance" : "newest",
    page: Number.isInteger(page) && page > 1 && page < 1000 ? page : 1,
    ...fixed,
  };
}

/** Builds a query string, dropping empty values. */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** URL-parameter form of a search (inverse of parseSearchParams). */
export function toQueryParams(p: SearchParams): Record<string, string | number | undefined> {
  return {
    q: p.q,
    country: p.country,
    region: p.region,
    cuisine: p.cuisine,
    category: p.category,
    diet: p.diet,
    type: p.drinkCategory,
    time: p.maxMinutes,
    difficulty: p.difficulty,
    rating: p.minRating,
    sort: p.sort && p.sort !== (p.q ? "relevance" : "newest") ? p.sort : undefined,
  };
}

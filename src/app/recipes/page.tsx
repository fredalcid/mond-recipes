import type { Metadata } from "next";
import { RecipeSearchView } from "@/components/search/RecipeSearchView";
import { parseSearchParams } from "@/lib/search-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).length > 0;
  return {
    title: "Recipes",
    description: "Search recipes from around the world by name, ingredient, country, meal, diet, time and difficulty.",
    alternates: { canonical: "/recipes" },
    // Filtered and paged result lists are not indexed; the recipes themselves are.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function RecipesPage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  return (
    <RecipeSearchView
      kind="food"
      path="/recipes"
      crumb="Recipes"
      eyebrow="Recipes"
      title="Find your next favourite dish"
      intro="Combine filters to narrow it down: try a country with a meal type, a diet and a time limit."
      params={params}
    />
  );
}

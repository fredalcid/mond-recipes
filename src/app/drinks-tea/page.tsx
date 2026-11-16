import type { Metadata } from "next";
import Link from "next/link";
import { RecipeSearchView } from "@/components/search/RecipeSearchView";
import { parseSearchParams } from "@/lib/search-params";
import { drinkCategoryList } from "@/lib/demo/taxonomy";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Drinks & Tea",
    description: "Tea, coffee, juices, smoothies, mocktails and traditional drinks from around the world.",
    alternates: { canonical: "/drinks-tea" },
    robots: Object.keys(sp).length > 0 ? { index: false, follow: true } : undefined,
  };
}

/** Quick links shown above the results. Same slugs as the database's drink categories. */
const FEATURED = ["tea", "traditional-tea", "herbal-tea", "coffee", "juices", "smoothies", "mocktails", "traditional-beverages", "hot-beverages", "cold-beverages"];

export default async function DrinksPage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  return (
    <RecipeSearchView
      kind="drink"
      path="/drinks-tea"
      crumb="Drinks & Tea"
      eyebrow="Drinks & Tea"
      title="Drinks and tea from every corner of the world"
      intro="Traditional teas and coffees, fresh juices, smoothies, mocktails and more."
      params={params}
    >
      <nav aria-label="Drink types" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {drinkCategoryList
            .filter((d) => FEATURED.includes(d.slug))
            .map((d) => {
              const active = params.drinkCategory === d.slug;
              return (
                <li key={d.slug}>
                  <Link
                    href={active ? "/drinks-tea" : `/drinks-tea?type=${d.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                      active ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white text-forest-900 hover:border-forest-900"
                    }`}
                  >
                    {d.name}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </RecipeSearchView>
  );
}

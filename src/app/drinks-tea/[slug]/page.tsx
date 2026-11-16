import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeView } from "@/components/recipe/RecipeView";
import { getData } from "@/lib/data";
import { loadRecipe, recipeMetadata } from "@/lib/recipe-page";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

// Pages are built on first visit and then cached (incremental static regeneration).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return recipeMetadata((await params).slug, "drink");
}

export default async function DrinkPage({ params }: Props) {
  const recipe = await loadRecipe((await params).slug, "drink");
  if (!recipe) notFound();
  const related = await getData().getRelated(recipe).catch(() => []);
  const crumbs = [
    { label: "Drinks & Tea", href: "/drinks-tea" },
    ...(recipe.drinkCategory ? [{ label: recipe.drinkCategory.name, href: `/drinks-tea?type=${recipe.drinkCategory.slug}` }] : []),
    { label: recipe.title },
  ];
  return <RecipeView recipe={recipe} related={related} crumbs={crumbs} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeView } from "@/components/recipe/RecipeView";
import { getData } from "@/lib/data";
import { loadRecipe, recipeMetadata } from "@/lib/recipe-page";

type Props = { params: Promise<{ slug: string }> };

// Re-check the database at most every 5 minutes; editors' changes appear without a redeploy.
export const revalidate = 300;

// Pages are built on first visit and then cached (incremental static regeneration).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return recipeMetadata((await params).slug, "food");
}

export default async function RecipePage({ params }: Props) {
  const recipe = await loadRecipe((await params).slug, "food");
  if (!recipe) notFound();
  const related = await getData().getRelated(recipe).catch(() => []);
  const crumbs = [
    { label: "Recipes", href: "/recipes" },
    ...(recipe.countryLinks[0] ? [{ label: recipe.countryLinks[0].name, href: `/countries/${recipe.countryLinks[0].slug}` }] : []),
    { label: recipe.title },
  ];
  return <RecipeView recipe={recipe} related={related} crumbs={crumbs} />;
}

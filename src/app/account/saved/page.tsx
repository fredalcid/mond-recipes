import type { Metadata } from "next";
import Link from "next/link";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { getCurrentMember } from "@/lib/auth";
import { listSavedRecipes } from "@/lib/community/server";

export const metadata: Metadata = { title: "Saved recipes", robots: { index: false } };

export default async function SavedRecipesPage() {
  const member = (await getCurrentMember())!;
  const recipes = await listSavedRecipes(member.id);
  return (
    <div>
      <h1 className="text-4xl font-semibold text-forest-900">Saved recipes</h1>
      <p className="mt-2 text-ink-muted">
        Recipes you save with the heart button. Only you can see this list unless you choose to show it on your profile in{" "}
        <Link href="/account/profile" className="font-semibold underline">
          Profile
        </Link>
        .
      </p>
      <div className="mt-8">
        {recipes.length ? (
          <RecipeGrid recipes={recipes} columns={3} />
        ) : (
          <div className="rounded-card border border-dashed border-sand-strong bg-white p-8 text-center text-ink-muted">
            <p>You haven&apos;t saved any recipes yet.</p>
            <Link href="/recipes" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream">
              Find recipes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

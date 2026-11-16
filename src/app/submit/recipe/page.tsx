import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { RecipeEditor } from "@/components/admin/RecipeEditor";
import { getCurrentMember } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { loadEditorOptions } from "@/app/admin/recipes/editor-data";
import { saveMemberRecipe } from "./actions";
import { SubmitIntro } from "./SubmitIntro";

export const metadata: Metadata = { title: "Share a recipe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SubmitRecipePage() {
  if (!isSupabaseConfigured()) {
    return (
      <Container className="max-w-3xl py-14">
        <h1 className="text-4xl font-semibold text-forest-900">Share a recipe</h1>
        <p className="mt-4 text-lg text-ink-muted">Recipe sharing opens once member accounts are switched on.</p>
      </Container>
    );
  }
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/submit/recipe");
  const options = member.emailVerified ? await loadEditorOptions() : null;

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-4 text-4xl font-semibold text-forest-900 sm:text-5xl">Share a recipe</h1>
      <SubmitIntro />
      {!options ? (
        <FormMessage tone="info">Confirm your email address before sharing recipes. Check your inbox for the link we sent when you joined.</FormMessage>
      ) : (
        <RecipeEditor
          mode="member"
          saveAction={saveMemberRecipe}
          options={options}
          imageUrl={null}
          initial={{
            kind: "food",
            title: "",
            slug: "",
            summary: "",
            status: "draft",
            verification: "community",
            countries: [],
            regions: [],
            cuisines: [],
            categories: [],
            diets: [],
            allergens: [],
            ingredients: [{ name: "", quantity: "", unit: "", note: "", group: "" }],
            steps: [{ body: "", timer_minutes: "" }],
            source: { type: "original", description: "", url: "" },
          }}
        />
      )}
    </Container>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { RecipeEditor } from "@/components/admin/RecipeEditor";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/data/supabase-source";
import { loadEditorOptions, loadRecipeForEditing } from "@/app/admin/recipes/editor-data";
import { saveMemberRecipe } from "../actions";
import { SubmitIntro } from "../SubmitIntro";

export const metadata: Metadata = { title: "Edit your recipe", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

export default async function EditMemberRecipe({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const member = await getCurrentMember();
  if (!member) redirect(`/sign-in?next=/submit/recipe/${id}`);
  const db = await createClient();
  if (!db) return null;
  const { data: row } = await db.from("recipes").select("author_id, status").eq("id", id).maybeSingle();
  if (!row || row.author_id !== member.id) notFound();
  if (!["draft", "pending", "rejected"].includes(row.status)) redirect("/account/contributions");
  const [recipe, options] = await Promise.all([loadRecipeForEditing(id), loadEditorOptions()]);
  if (!recipe) notFound();
  const { saved } = await searchParams;

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-4 text-4xl font-semibold text-forest-900 sm:text-5xl">Edit your recipe</h1>
      <div className="mb-6 flex flex-col gap-3">
        {saved === "1" && <FormMessage tone="success">Draft saved. Send it for review when it&apos;s ready.</FormMessage>}
        {row.status === "pending" && <FormMessage tone="info">This recipe is waiting for review. You can still make changes.</FormMessage>}
        {row.status === "rejected" && <FormMessage tone="error">Our team asked for changes. Check your notifications for their note, then send it for review again.</FormMessage>}
      </div>
      <SubmitIntro />
      <RecipeEditor mode="member" saveAction={saveMemberRecipe} options={options} imageUrl={publicImageUrl(recipe.hero_image_path)} initial={recipe.value} />
    </Container>
  );
}

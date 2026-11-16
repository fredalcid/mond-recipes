import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { RecipeEditor } from "@/components/admin/RecipeEditor";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { publicImageUrl } from "@/lib/data/supabase-source";
import { recipeHref } from "@/lib/data/types";
import { deleteRecipeAction } from "../actions";
import { loadEditorOptions, loadRecipeForEditing } from "../editor-data";

export const metadata = { title: "Edit recipe" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; delete?: string }> };

export default async function EditRecipePage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { saved, delete: del } = await searchParams;
  const member = await getCurrentMember();
  const editable = canEditContent(member);
  const [recipe, options] = await Promise.all([loadRecipeForEditing(id), loadEditorOptions()]);
  if (!recipe) notFound();
  const v = recipe.value;

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">Edit recipe</h1>
        {v.status === "published" && (
          <Link href={recipeHref({ slug: v.slug, kind: v.kind })} className="font-semibold text-forest-900 underline underline-offset-4">
            View on the site →
          </Link>
        )}
      </div>
      <div className="mb-6 flex flex-col gap-3">
        {saved === "1" && <FormMessage tone="success">Saved. The public page updates within a few minutes.</FormMessage>}
        {del === "failed" && <FormMessage tone="error">The recipe couldn&apos;t be deleted.</FormMessage>}
        {!editable && <FormMessage tone="info">You can view this recipe. Only editors and super admins can change it.</FormMessage>}
      </div>

      {editable ? (
        <RecipeEditor initial={v} options={options} imageUrl={publicImageUrl(recipe.hero_image_path)} />
      ) : (
        <pre className="overflow-x-auto rounded-card bg-white p-6 text-sm">{JSON.stringify(v, null, 2)}</pre>
      )}

      {editable && (
        <section aria-labelledby="danger" className="mt-12 rounded-card border border-danger/40 bg-white p-6">
          <h2 id="danger" className="text-2xl font-semibold text-danger">
            Delete this recipe
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            This removes the recipe, its ingredients, steps and saved copies. It can&apos;t be undone. To hide it instead, set the status to Unpublished.
          </p>
          <form action={deleteRecipeAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={id} />
            <div className="flex flex-col gap-1">
              <label htmlFor="confirm-delete" className="text-sm font-semibold">
                Type DELETE to confirm
              </label>
              <input id="confirm-delete" name="confirm" autoComplete="off" className="min-h-11 rounded-xl border border-sand-strong px-3" />
            </div>
            <button type="submit" className="min-h-11 rounded-full bg-danger px-5 font-semibold text-white">
              Delete recipe
            </button>
          </form>
          {del === "confirm" && <p className="mt-2 text-sm font-medium text-danger">Type DELETE exactly to confirm.</p>}
        </section>
      )}
    </Container>
  );
}

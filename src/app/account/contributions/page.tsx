import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { listMemberRecipes, listPosts } from "@/lib/community/server";
import { formatDate } from "@/lib/format";
import { deleteDraftRecipe, deletePost } from "../actions";

export const metadata: Metadata = { title: "My contributions", robots: { index: false } };

const RECIPE_STATUS: Record<string, [string, string]> = {
  draft: ["Draft", "Only you can see it."],
  pending: ["Waiting for review", "Our team will review it soon."],
  published: ["Published", ""],
  rejected: ["Changes needed", "Edit it and send it for review again."],
  unpublished: ["Unpublished", "Taken down by our editors."],
  removed: ["Removed", "Removed by our moderators."],
};
const POST_STATUS: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  reported: "Approved",
  rejected: "Not approved",
  removed: "Removed by a moderator",
};

export default async function ContributionsPage({ searchParams }: { searchParams: Promise<{ deleted?: string; sent?: string }> }) {
  const member = await getCurrentMember();
  if (!member) return null; // the layout shows sign-in or "not connected"
  const { deleted, sent } = await searchParams;
  const [recipes, posts] = await Promise.all([listMemberRecipes(member.id), listPosts({ authorId: member.id, pageSize: 60 })]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">My contributions</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/submit/recipe" className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 text-sm font-semibold text-cream">
            Share a recipe
          </Link>
          <Link href="/community/new" className="inline-flex min-h-11 items-center rounded-full border border-forest-900 px-5 text-sm font-semibold text-forest-900">
            New post
          </Link>
        </div>
      </div>
      {deleted === "1" && <FormMessage tone="success">Deleted.</FormMessage>}
      {sent === "recipe" && <FormMessage tone="success">Thank you! Your recipe was sent for review. We&apos;ll let you know when it&apos;s published.</FormMessage>}
      {sent === "post" && <FormMessage tone="success">Thank you! Your post was sent for review and appears in the community once approved.</FormMessage>}

      <section aria-labelledby="my-recipes">
        <h2 id="my-recipes" className="text-2xl font-semibold text-forest-900">
          Recipes
        </h2>
        {recipes.length === 0 ? (
          <p className="mt-4 text-ink-muted">You haven&apos;t shared a recipe yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-sand rounded-card border border-sand-strong bg-white">
            {recipes.map((r) => {
              const [label, hint] = RECIPE_STATUS[r.status] ?? [r.status, ""];
              const editable = ["draft", "pending", "rejected"].includes(r.status);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {r.status === "published" ? (
                      <Link href={r.kind === "drink" ? `/drinks-tea/${r.slug}` : `/recipes/${r.slug}`} className="font-semibold text-forest-900 hover:underline">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{r.title}</span>
                    )}
                    <p className="text-sm text-ink-muted">
                      <strong className={r.status === "rejected" ? "text-danger" : "text-ink"}>{label}</strong>
                      {hint && ` · ${hint}`}
                    </p>
                  </div>
                  {editable && (
                    <Link href={`/submit/recipe/${r.id}`} className="inline-flex min-h-10 items-center rounded-full border border-sand-strong px-4 text-sm font-semibold hover:bg-sand">
                      Edit
                    </Link>
                  )}
                  {r.status === "draft" && (
                    <form action={deleteDraftRecipe}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="min-h-10 rounded-full px-4 text-sm font-semibold text-danger hover:bg-sand">
                        Delete draft
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-sm text-ink-muted">Published recipes can&apos;t be edited by their author. Contact us to request a change or removal.</p>
      </section>

      <section aria-labelledby="my-posts">
        <h2 id="my-posts" className="text-2xl font-semibold text-forest-900">
          Photos, videos and tips
        </h2>
        {posts.items.length === 0 ? (
          <p className="mt-4 text-ink-muted">You haven&apos;t posted yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-sand rounded-card border border-sand-strong bg-white">
            {posts.items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/community/posts/${p.id}`} className="line-clamp-1 font-semibold text-forest-900 hover:underline">
                    {p.body}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    <strong className={p.status === "rejected" || p.status === "removed" ? "text-danger" : "text-ink"}>{POST_STATUS[p.status]}</strong>
                    {" · "}
                    {formatDate(p.createdAt)}
                    {p.moderationNote && ` · Moderator note: ${p.moderationNote}`}
                  </p>
                </div>
                <form action={deletePost}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="min-h-10 rounded-full px-4 text-sm font-semibold text-danger hover:bg-sand">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

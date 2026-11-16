import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader } from "@/components/admin/AdminBits";
import { PostMediaView } from "@/components/community/PostCard";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent, canModerate } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_SELECT, POST_SELECT, mapMember, mapPost } from "@/lib/community/server";
import { REPORT_REASONS, timeAgo, type MemberSummary } from "@/lib/community/types";
import { dismissReport, moderateItem } from "../moderation-actions";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

export const metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tab?: string; done?: string; error?: string }> };
const TABS = [
  ["recipes", "Recipes to review"],
  ["posts", "Posts to review"],
  ["reports", "Reports"],
] as const;
const REASON = Object.fromEntries(REPORT_REASONS) as Record<string, string>;
const DONE: Record<string, string> = {
  approve: "Approved. The author has been notified.",
  reject: "Sent back to the author with your note.",
  remove: "Removed. The author has been notified.",
  restore: "Restored and the reports were closed.",
  dismissed: "Report dismissed.",
};
const ERRORS: Record<string, string> = {
  "not-allowed": "You don't have permission to do that.",
  "needs-content": "A recipe needs ingredients and steps before it can be published.",
  failed: "That didn't work. The item may already have been handled.",
};

export default async function ModerationPage({ searchParams }: Props) {
  const member = await getCurrentMember();
  if (!canModerate(member)) notFound();
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "recipes";
  const db = (await createClient())!;

  const [recipes, posts, reports] = await Promise.all([
    db
      .from("recipes")
      .select(
        `id, title, kind, summary, prep_minutes, cook_minutes, servings, tips, updated_at, author:profiles ( ${MEMBER_SELECT} ),
         recipe_ingredients ( position, quantity, unit, note, ingredients ( name ) ), recipe_steps ( position, body ),
         recipe_countries ( countries ( name ) ), recipe_sources ( source_type, description, url )`,
      )
      .eq("status", "pending")
      .not("author_id", "is", null)
      .order("updated_at")
      .limit(100),
    db.from("community_posts").select(POST_SELECT).eq("status", "pending").order("created_at").limit(100),
    db.from("reports").select("id, target_type, target_id, reason, details, created_at").eq("status", "open").order("created_at").limit(300),
  ]);
  const counts = { recipes: recipes.data?.length ?? 0, posts: posts.data?.length ?? 0, reports: reports.data?.length ?? 0 };

  return (
    <Container className="max-w-5xl py-10">
      <AdminHeader title="Moderation" />
      <nav aria-label="Moderation queues" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/moderation?tab=${k}`}
            aria-current={k === tab ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${k === tab ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}
          >
            {label} <span className="ml-1.5 opacity-75">({counts[k]})</span>
          </Link>
        ))}
      </nav>
      <div className="mb-6 flex flex-col gap-3">
        {sp.done && DONE[sp.done] && <FormMessage tone="success">{DONE[sp.done]}</FormMessage>}
        {sp.error && <FormMessage tone="error">{ERRORS[sp.error] ?? ERRORS.failed}</FormMessage>}
      </div>

      {tab === "recipes" && <RecipeQueue rows={(recipes.data ?? []) as any[]} canEdit={canEditContent(member)} />}
      {tab === "posts" && <PostQueue rows={(posts.data ?? []) as any[]} />}
      {tab === "reports" && <ReportQueue rows={(reports.data ?? []) as any[]} />}
    </Container>
  );
}

function Decision({ type, id, tab, actions }: { type: string; id: string; tab: string; actions: [string, string, string][] }) {
  return (
    <form action={moderateItem} className="flex flex-col gap-3 border-t border-sand pt-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={`/admin/moderation?tab=${tab}`} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Note to the member (optional, shown in their notification)</span>
        <input name="note" maxLength={500} className="min-h-11 rounded-xl border border-sand-strong px-3" placeholder="e.g. Please add quantities for each ingredient." />
      </label>
      <div className="flex flex-wrap gap-2">
        {actions.map(([value, label, style]) => (
          <button key={value} type="submit" name="action" value={value} className={`min-h-11 rounded-full px-5 text-sm font-semibold ${style}`}>
            {label}
          </button>
        ))}
      </div>
    </form>
  );
}

const APPROVE = "bg-forest-900 text-cream hover:bg-forest-800";
const NEUTRAL = "border border-sand-strong bg-white hover:bg-sand";
const DANGER = "border border-danger text-danger hover:bg-danger hover:text-white";

function Who({ member, when }: { member: MemberSummary; when: string }) {
  return (
    <p className="text-sm text-ink-muted">
      by{" "}
      <Link href={`/members/${member.username}`} className="font-semibold text-forest-900 hover:underline">
        {member.displayName}
      </Link>{" "}
      · {timeAgo(when)}
    </p>
  );
}

const SOURCE: Record<string, string> = { original: "Original recipe", family: "Family recipe", adapted: "Adapted from another recipe" };

function RecipeQueue({ rows, canEdit }: { rows: any[]; canEdit: boolean }) {
  if (rows.length === 0) return <p className="text-ink-muted">No member recipes are waiting for review.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 rounded-card border border-sand-strong bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-forest-900">{r.title}</h2>
              <Who member={mapMember(r.author)} when={r.updated_at} />
            </div>
            {canEdit && (
              <Link href={`/admin/recipes/${r.id}`} className="inline-flex min-h-11 items-center rounded-full border border-forest-900 px-4 text-sm font-semibold text-forest-900">
                Open in the editor
              </Link>
            )}
          </div>
          {r.summary && <p className="text-ink-muted">{r.summary}</p>}
          <details className="rounded-xl bg-ivory p-4">
            <summary className="cursor-pointer font-semibold text-forest-900">Read the full recipe</summary>
            <div className="mt-3 grid gap-6 text-sm md:grid-cols-[1fr_2fr]">
              <div>
                <p className="text-ink-muted">
                  {(r.recipe_countries ?? []).map((c: any) => c.countries?.name).filter(Boolean).join(", ") || "No country"}
                  {r.servings ? ` · serves ${r.servings}` : ""}
                  {r.prep_minutes || r.cook_minutes ? ` · ${(r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)} min` : ""}
                </p>
                <h3 className="mt-3 font-semibold">Ingredients</h3>
                <ul className="mt-1 list-disc pl-5">
                  {[...(r.recipe_ingredients ?? [])]
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((i: any) => (
                      <li key={i.position}>
                        {[i.quantity == null ? "" : Number(i.quantity), i.unit, i.ingredients?.name].filter(Boolean).join(" ")}
                        {i.note ? `, ${i.note}` : ""}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Method</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  {[...(r.recipe_steps ?? [])]
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((st: any) => (
                      <li key={st.position}>{st.body}</li>
                    ))}
                </ol>
                {r.tips && <p className="mt-3"><strong>Tips:</strong> {r.tips}</p>}
                {(r.recipe_sources ?? [])[0] && (
                  <p className="mt-3">
                    <strong>Source:</strong> {SOURCE[r.recipe_sources[0].source_type] ?? r.recipe_sources[0].source_type}
                    {r.recipe_sources[0].description ? ` · ${r.recipe_sources[0].description}` : ""}
                    {r.recipe_sources[0].url ? ` · ${r.recipe_sources[0].url}` : ""}
                  </p>
                )}
              </div>
            </div>
          </details>
          <p className="text-sm text-ink-muted">
            Check the recipe is original or credited, complete and safe.{canEdit ? " You can fix small things in the editor before approving." : " If it needs small fixes, ask for changes with a note."}
          </p>
          <Decision
            type="recipe"
            id={r.id}
            tab="recipes"
            actions={[
              ["approve", "Approve and publish", APPROVE],
              ["reject", "Ask for changes", NEUTRAL],
              ["remove", "Decline", DANGER],
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

function PostQueue({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="text-ink-muted">No posts are waiting for review.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map(mapPost).map((p) => (
        <li key={p.id} className="flex flex-col gap-3 rounded-card border border-sand-strong bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-forest-900 capitalize">{p.kind}</h2>
            <Who member={p.author} when={p.createdAt} />
          </div>
          <div className="max-w-md">
            <PostMediaView media={p.media} title={`Post by ${p.author.displayName}`} />
          </div>
          <p className="whitespace-pre-line">{p.body}</p>
          {p.recipe && <p className="text-sm text-ink-muted">Linked recipe: {p.recipe.title}</p>}
          {p.challenge && <p className="text-sm text-ink-muted">Challenge: {p.challenge.title}</p>}
          <Decision
            type="post"
            id={p.id}
            tab="posts"
            actions={[
              ["approve", "Approve", APPROVE],
              ["reject", "Decline", NEUTRAL],
              ["remove", "Remove", DANGER],
            ]}
          />
        </li>
      ))}
    </ul>
  );
}

async function ReportQueue({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <p className="text-ink-muted">No open reports.</p>;
  const db = (await createClient())!;
  // Group reports about the same thing.
  const groups = new Map<string, { type: string; id: string; reports: any[] }>();
  for (const r of rows) {
    const key = `${r.target_type}:${r.target_id}`;
    if (!groups.has(key)) groups.set(key, { type: r.target_type, id: r.target_id, reports: [] });
    groups.get(key)!.reports.push(r);
  }
  const ids = (type: string) => [...groups.values()].filter((g) => g.type === type).map((g) => g.id);
  const none = Promise.resolve({ data: [] as any[] });
  const [posts, comments, reviews, recipes, profiles] = await Promise.all([
    ids("post").length ? db.from("community_posts").select(POST_SELECT).in("id", ids("post")) : none,
    ids("comment").length
      ? db.from("comments").select(`id, body, status, recipe_id, post_id, created_at, author:profiles!comments_author_id_fkey ( ${MEMBER_SELECT} )`).in("id", ids("comment"))
      : none,
    ids("review").length
      ? db.from("recipe_reviews").select(`id, rating, body, status, created_at, recipe:recipes ( title, slug ), author:profiles!recipe_reviews_author_id_fkey ( ${MEMBER_SELECT} )`).in("id", ids("review"))
      : none,
    ids("recipe").length ? db.from("recipes").select("id, title, slug, kind, status").in("id", ids("recipe")) : none,
    ids("profile").length ? db.from("profiles").select(`${MEMBER_SELECT}, bio, is_suspended`).in("id", ids("profile")) : none,
  ]);
  const find = (list: { data: any[] | null }, id: string) => (list.data ?? []).find((x: any) => x.id === id);

  return (
    <ul className="flex flex-col gap-4">
      {[...groups.values()]
        .sort((a, b) => b.reports.length - a.reports.length)
        .map((g) => {
          let content: React.ReactNode = <p className="text-ink-muted">This item no longer exists.</p>;
          let canModerateItem = true;
          if (g.type === "post" && find(posts, g.id)) {
            const p = mapPost(find(posts, g.id));
            content = (
              <>
                <Who member={p.author} when={p.createdAt} />
                <Link href={`/community/posts/${p.id}`} className="font-semibold text-forest-900 underline">
                  Open post
                </Link>
                <p className="line-clamp-4 whitespace-pre-line">{p.body}</p>
              </>
            );
          } else if (g.type === "comment" && find(comments, g.id)) {
            const c = find(comments, g.id);
            content = (
              <>
                <Who member={mapMember(c.author)} when={c.created_at} />
                <blockquote className="border-l-4 border-sand-strong pl-3 whitespace-pre-line">{c.body}</blockquote>
                {c.post_id && (
                  <Link href={`/community/posts/${c.post_id}#comments`} className="text-sm font-semibold text-forest-900 underline">
                    See it in context
                  </Link>
                )}
              </>
            );
          } else if (g.type === "review" && find(reviews, g.id)) {
            const r = find(reviews, g.id);
            content = (
              <>
                <Who member={mapMember(r.author)} when={r.created_at} />
                <p>
                  {r.rating}★ on {r.recipe ? <Link href={`/recipes/${r.recipe.slug}#reviews`} className="font-semibold text-forest-900 underline">{r.recipe.title}</Link> : "a recipe"}
                </p>
                {r.body && <blockquote className="border-l-4 border-sand-strong pl-3 whitespace-pre-line">{r.body}</blockquote>}
              </>
            );
          } else if (g.type === "recipe" && find(recipes, g.id)) {
            const r = find(recipes, g.id);
            content = (
              <p>
                Recipe:{" "}
                <Link href={`/admin/recipes/${r.id}`} className="font-semibold text-forest-900 underline">
                  {r.title}
                </Link>{" "}
                <span className="text-ink-muted">({r.status})</span>
              </p>
            );
          } else if (g.type === "profile" && find(profiles, g.id)) {
            const m = find(profiles, g.id);
            canModerateItem = false;
            content = (
              <>
                <p>
                  Member:{" "}
                  <Link href={`/members/${m.username}`} className="font-semibold text-forest-900 underline">
                    {m.display_name}
                  </Link>
                  {m.is_suspended && <span className="ml-2 text-danger">(suspended)</span>}
                </p>
                {m.bio && <p className="text-ink-muted">{m.bio}</p>}
                <Link href={`/admin/members?q=${encodeURIComponent(m.username)}`} className="text-sm font-semibold text-forest-900 underline">
                  Suspend or restore in Members
                </Link>
              </>
            );
          }
          return (
            <li key={`${g.type}:${g.id}`} className="flex flex-col gap-3 rounded-card border border-sand-strong bg-white p-5">
              <h2 className="text-lg font-semibold text-forest-900">
                <span className="capitalize">{g.type}</span> · {g.reports.length} {g.reports.length === 1 ? "report" : "reports"}
              </h2>
              {content}
              <ul className="flex flex-col gap-2 rounded-xl bg-sand/50 p-3 text-sm">
                {g.reports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{REASON[r.reason] ?? r.reason}</strong>
                      {r.details && ` · “${r.details}”`} <span className="text-ink-muted">· {timeAgo(r.created_at)}</span>
                    </span>
                    <form action={dismissReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value="/admin/moderation?tab=reports" />
                      <button type="submit" className="min-h-9 rounded-full px-3 font-semibold hover:bg-white">
                        Dismiss
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              {canModerateItem && (
                <Decision
                  type={g.type}
                  id={g.id}
                  tab="reports"
                  actions={[
                    ["restore", "Keep it (close reports)", NEUTRAL],
                    ["remove", "Remove it", DANGER],
                  ]}
                />
              )}
            </li>
          );
        })}
    </ul>
  );
}

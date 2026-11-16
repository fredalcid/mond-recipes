import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { PostGrid } from "@/components/community/PostCard";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { isSupabaseConfigured } from "@/lib/env";
import { featuredMembers, listChallenges, listPosts, recentMemberRecipes, type PostQuery } from "@/lib/community/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Community",
  description: "Cooking photos, videos, tips and recipes shared by home cooks around the world.",
  alternates: { canonical: "/community" },
};
export const dynamic = "force-dynamic";

const VIEWS = [
  ["latest", "Latest"],
  ["popular", "Popular"],
  ["photos", "Photos"],
  ["videos", "Videos"],
  ["tips", "Tips"],
] as const;

type Props = { searchParams: Promise<{ view?: string; page?: string }> };

export default async function CommunityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const view = (VIEWS.some(([k]) => k === sp.view) ? sp.view : "latest") as NonNullable<PostQuery["view"]>;
  const page = Math.max(1, Number(sp.page) || 1);
  const live = isSupabaseConfigured();
  const [posts, members, challenges, recipes] = await Promise.all([
    listPosts({ view, page }),
    featuredMembers(6),
    listChallenges(),
    page === 1 ? recentMemberRecipes(4) : Promise.resolve([]),
  ]);
  const href = (v: string, p = 1) => `/community${v === "latest" && p === 1 ? "" : `?${new URLSearchParams({ ...(v !== "latest" ? { view: v } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`}`;

  return (
    <>
      <section className="border-b border-sand-strong bg-forest-900 text-cream">
        <Container className="flex flex-col gap-6 py-12 sm:py-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-gold-500 uppercase">The Mònd community</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Cook it, photograph it, share it.</h1>
            <p className="mt-4 text-lg text-cream/85">
              Photos, videos and tips from home cooks around the world. Every post is reviewed by our moderators before it appears.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/community/new" className="inline-flex min-h-12 items-center rounded-full bg-gold-500 px-6 font-semibold text-forest-950 hover:bg-gold-600">
              Share a photo, video or tip
            </Link>
            <Link href="/submit/recipe" className="inline-flex min-h-12 items-center rounded-full border border-cream/60 px-6 font-semibold text-cream hover:bg-cream/10">
              Share a recipe
            </Link>
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <nav aria-label="Community views" className="-mx-1 mb-8 flex gap-1 overflow-x-auto pb-1">
            {VIEWS.map(([k, label]) => (
              <Link
                key={k}
                href={href(k)}
                aria-current={k === view ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${k === view ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <PostGrid
            posts={posts.items}
            empty={
              <div className="rounded-card border border-dashed border-sand-strong bg-white p-10 text-center">
                {live ? (
                  <>
                    <p className="text-lg text-ink-muted">{view === "popular" ? "Nothing popular yet this month." : "No posts here yet."}</p>
                    <p className="mt-1 text-ink-muted">Cooked something you&apos;re proud of? Be one of the first to share it.</p>
                    <Link href="/community/new" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream">
                      Share a post
                    </Link>
                  </>
                ) : (
                  <p className="text-lg text-ink-muted">The community opens once member accounts are switched on. Only real member posts will appear here.</p>
                )}
              </div>
            }
          />
          {(page > 1 || posts.hasMore) && (
            <div className="mt-8 flex justify-between">
              {page > 1 ? <Link href={href(view, page - 1)} className="font-semibold text-forest-900 underline">← Newer</Link> : <span />}
              {posts.hasMore && <Link href={href(view, page + 1)} className="font-semibold text-forest-900 underline">More posts →</Link>}
            </div>
          )}

          {recipes.length > 0 && (
            <section aria-labelledby="member-recipes" className="mt-14">
              <h2 id="member-recipes" className="mb-6 text-3xl font-semibold text-forest-900">
                Recently shared recipes
              </h2>
              <RecipeGrid recipes={recipes} columns={4} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="challenges-title" className="rounded-card border border-sand-strong bg-white p-5">
            <h2 id="challenges-title" className="text-2xl font-semibold text-forest-900">
              Challenges
            </h2>
            {challenges.current.length === 0 && challenges.upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No challenge running right now. Check back soon.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {[...challenges.current, ...challenges.upcoming].slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link href={`/community/challenges/${c.slug}`} className="block rounded-xl bg-sand/60 p-3 hover:bg-sand">
                      <span className="block font-semibold text-forest-900">{c.title}</span>
                      <span className="text-sm text-ink-muted">
                        {challenges.current.includes(c) ? `Until ${formatDate(c.endsOn)}` : `Starts ${formatDate(c.startsOn)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/community/challenges" className="mt-4 inline-block text-sm font-semibold text-forest-900 underline underline-offset-4">
              All challenges
            </Link>
          </section>

          {members.length > 0 && (
            <section aria-labelledby="featured-title" className="rounded-card border border-sand-strong bg-white p-5">
              <h2 id="featured-title" className="text-2xl font-semibold text-forest-900">
                Featured cooks
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {members.map((m) => (
                  <li key={m.id}>
                    <Link href={`/members/${m.username}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-sand">
                      <MemberAvatar member={m} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-forest-900">{m.displayName}</span>
                        {m.country && <span className="text-sm text-ink-muted">{m.country.name}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-card bg-sand/60 p-5 text-sm">
            <h2 className="text-lg font-semibold text-forest-900">Before you post</h2>
            <p className="mt-2 text-ink-muted">Share only your own photos and recipes, be kind, and keep food safety in mind.</p>
            <Link href="/community-guidelines" className="mt-3 inline-block font-semibold text-forest-900 underline underline-offset-4">
              Community guidelines
            </Link>
          </section>
        </aside>
      </Container>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { FollowButton } from "@/components/community/FollowButton";
import { ReportButton } from "@/components/community/ReportButton";
import { BlockButton } from "@/components/community/BlockButton";
import { PostGrid } from "@/components/community/PostCard";
import { getCurrentMember } from "@/lib/auth";
import { getMemberByUsername, listMemberRecipes, listPosts, listSavedRecipes } from "@/lib/community/server";
import { CountryFlag } from "@/components/cards/CountryCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };
const TABS = [
  ["recipes", "Recipes"],
  ["photos", "Photos"],
  ["videos", "Videos"],
  ["tips", "Tips"],
  ["favourites", "Favourites"],
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const member = await getMemberByUsername((await params).username);
  if (!member || member.isSuspended) return { title: "Member not found", robots: { index: false } };
  return {
    title: `${member.displayName} (@${member.username})`,
    description: member.bio ?? `${member.displayName}'s recipes, cooking photos and tips on Mònd Recipes.`,
    alternates: { canonical: `/members/${member.username}` },
    // Profiles with nothing on them yet stay out of search results.
    robots: { index: false, follow: true },
  };
}

export default async function MemberPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const [member, viewer] = await Promise.all([getMemberByUsername(username), getCurrentMember()]);
  if (!member) notFound();
  const isMe = viewer?.id === member.id;
  const isStaff = Boolean(viewer?.roles.length);
  if (member.isSuspended && !isMe && !isStaff) notFound();

  const tabs = TABS.filter(([k]) => k !== "favourites" || member.showSaved || isMe);
  const tab = tabs.some(([k]) => k === rawTab) ? rawTab! : "recipes";
  const [recipes, posts, saved] = await Promise.all([
    listMemberRecipes(member.id),
    listPosts({ authorId: member.id, pageSize: 60 }),
    tab === "favourites" ? listSavedRecipes(member.id) : Promise.resolve([]),
  ]);
  const visibleRecipes = isMe ? recipes : recipes.filter((r) => r.status === "published");
  const kind = tab === "photos" ? "photo" : tab === "videos" ? "video" : "tip";
  const shownPosts = posts.items.filter((p) => p.kind === kind && (isMe || p.status === "approved" || p.status === "reported"));
  const counts: Record<string, number> = {
    recipes: visibleRecipes.length,
    photos: posts.items.filter((p) => p.kind === "photo").length,
    videos: posts.items.filter((p) => p.kind === "video").length,
    tips: posts.items.filter((p) => p.kind === "tip").length,
  };

  return (
    <>
      <section className="border-b border-sand-strong bg-sand/50">
        <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center">
          <MemberAvatar member={member} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-semibold text-forest-900 sm:text-5xl">{member.displayName}</h1>
            <p className="mt-1 text-ink-muted">
              @{member.username}
              {member.country && (
                <>
                  {" · "}
                  <Link href={`/countries/${member.country.slug}`} className="inline-flex items-center gap-1.5 align-middle hover:underline">
                    <CountryFlag iso2={member.country.iso2} name={member.country.name} className="h-3.5 w-5" />
                    {member.country.name}
                  </Link>
                </>
              )}
              {member.isFeatured && <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-forest-950">Featured cook</span>}
            </p>
            {member.bio && <p className="mt-3 max-w-2xl text-lg leading-relaxed whitespace-pre-line">{member.bio}</p>}
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <Link href={`/members/${member.username}/followers`} className="hover:underline">
                <strong>{member.followerCount}</strong> {member.followerCount === 1 ? "follower" : "followers"}
              </Link>
              <Link href={`/members/${member.username}/following`} className="hover:underline">
                <strong>{member.followingCount}</strong> following
              </Link>
              <span>
                Member since {new Date(member.joinedAt).toLocaleDateString("en-CA", { month: "long", year: "numeric" })}
              </span>
            </p>
            {member.isSuspended && <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">This account is suspended.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isMe ? (
              <Link href="/account/profile" className="inline-flex min-h-11 items-center rounded-full border border-forest-900 bg-white px-5 text-sm font-semibold text-forest-900">
                Edit profile
              </Link>
            ) : (
              <>
                <FollowButton memberId={member.id} name={member.displayName} />
                <BlockButton memberId={member.id} name={member.displayName} />
                <ReportButton target="profile" id={member.id} ownerId={member.id} />
              </>
            )}
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <nav aria-label="Profile sections" className="-mx-1 mb-8 flex gap-1 overflow-x-auto pb-1">
          {tabs.map(([k, label]) => (
            <Link
              key={k}
              href={`/members/${member.username}${k === "recipes" ? "" : `?tab=${k}`}`}
              aria-current={k === tab ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${k === tab ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}
            >
              {label}
              {k in counts && <span className="ml-1.5 opacity-70">{counts[k]}</span>}
            </Link>
          ))}
        </nav>

        {tab === "recipes" ? (
          visibleRecipes.length ? (
            <>
              {isMe && visibleRecipes.some((r) => r.status !== "published") && (
                <p className="mb-6 text-sm text-ink-muted">
                  Drafts and recipes waiting for review are only visible to you. Manage them in{" "}
                  <Link href="/account/contributions" className="font-semibold underline">
                    My contributions
                  </Link>
                  .
                </p>
              )}
              <RecipeGrid recipes={visibleRecipes} columns={4} />
            </>
          ) : (
            <Empty isMe={isMe} what="recipes" href="/submit/recipe" action="Share a recipe" />
          )
        ) : tab === "favourites" ? (
          saved.length ? (
            <RecipeGrid recipes={saved} columns={4} />
          ) : (
            <p className="text-ink-muted">{isMe ? "Recipes you save appear here." : "No favourites yet."}</p>
          )
        ) : (
          <PostGrid posts={shownPosts} showStatus={isMe} empty={<Empty isMe={isMe} what={tab} href={`/community/new?kind=${kind}`} action="Share one" />} />
        )}
      </Container>
    </>
  );
}

function Empty({ isMe, what, href, action }: { isMe: boolean; what: string; href: string; action: string }) {
  return (
    <div className="rounded-card border border-dashed border-sand-strong bg-white p-8 text-center text-ink-muted">
      <p>{isMe ? `You haven't shared any ${what} yet.` : `No ${what} shared yet.`}</p>
      {isMe && (
        <Link href={href} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream">
          {action}
        </Link>
      )}
    </div>
  );
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { mapSearchRow, publicClient } from "@/lib/data/supabase-source";
import { isSupabaseConfigured } from "@/lib/env";
import type { RecipeSummary } from "@/lib/data/types";
import { MEMBER_COLUMNS, memberFromRow, storageUrl, type Challenge, type MemberProfile, type MemberSummary, type NotificationItem, type Post } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows are mapped explicitly below. */

/**
 * Community reads use the visitor's own session, so Row Level Security decides
 * what they see (their own pending posts, nothing from members they blocked).
 * Without Supabase every list is empty: the site never invents community content.
 */
async function db(): Promise<SupabaseClient | null> {
  return createClient();
}

export const MEMBER_SELECT = MEMBER_COLUMNS;
export const POST_SELECT = `id, kind, body, status, moderation_note, like_count, comment_count, is_featured, created_at, approved_at,
  author:profiles!community_posts_author_id_fkey ( ${MEMBER_SELECT} ),
  post_media ( position, media_type, storage_path, youtube_id, alt ),
  recipe:recipes ( id, slug, title, kind ),
  challenge:challenges ( slug, title )`;
const RECIPE_CARD_SELECT = `id, slug, title, summary, kind, prep_minutes, cook_minutes, total_minutes, difficulty, hero_image_path,
  rating_average, rating_count, save_count, verification, is_sample, status, recipe_countries ( countries ( name, iso2 ) )`;

export const mapMember = memberFromRow;

export function mapPost(r: any): Post {
  return {
    id: r.id,
    kind: r.kind,
    body: r.body,
    status: r.status,
    moderationNote: r.moderation_note ?? null,
    author: mapMember(r.author),
    media: [...(r.post_media ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((m: any) => ({ type: m.media_type, url: storageUrl("community", m.storage_path), youtubeId: m.youtube_id, alt: m.alt })),
    recipe: r.recipe ? { id: r.recipe.id, slug: r.recipe.slug, title: r.recipe.title, kind: r.recipe.kind } : null,
    challenge: r.challenge ? { slug: r.challenge.slug, title: r.challenge.title } : null,
    likeCount: r.like_count ?? 0,
    commentCount: r.comment_count ?? 0,
    isFeatured: Boolean(r.is_featured),
    createdAt: r.created_at,
    approvedAt: r.approved_at,
  };
}

export function mapRecipeCard(r: any): RecipeSummary & { status: string } {
  const countries = (r.recipe_countries ?? []).map((x: any) => x.countries).filter(Boolean);
  return {
    ...mapSearchRow({ ...r, cuisines: [], countries: countries.map((c: any) => c.name), country_codes: countries.map((c: any) => c.iso2) }),
    status: r.status,
  };
}

function mapChallenge(r: any): Challenge {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    imageUrl: storageUrl("media", r.hero_image_path),
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    sponsorName: r.sponsor_name,
    status: r.status,
  };
}

export type PostQuery = {
  view?: "latest" | "popular" | "photos" | "videos" | "tips" | "featured";
  authorId?: string;
  recipeId?: string;
  challengeId?: string;
  page?: number;
  pageSize?: number;
};

export async function listPosts(q: PostQuery = {}): Promise<{ items: Post[]; hasMore: boolean }> {
  const supabase = await db();
  if (!supabase) return { items: [], hasMore: false };
  const size = Math.min(q.pageSize ?? 24, 60);
  const page = Math.max(1, q.page ?? 1);

  if (q.view === "popular") {
    const { data: ids } = await supabase.rpc("popular_posts", { p_days: 30, p_limit: 60 });
    const order = ((ids ?? []) as any[]).map((r) => r.id as string);
    if (order.length === 0) return { items: [], hasMore: false };
    const { data } = await supabase.from("community_posts").select(POST_SELECT).in("id", order);
    const byId = new Map(((data ?? []) as any[]).map((r) => [r.id, mapPost(r)]));
    const all = order.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
    return { items: all.slice((page - 1) * size, page * size), hasMore: all.length > page * size };
  }

  let query = supabase.from("community_posts").select(POST_SELECT);
  // Public lists only show approved posts; a member's own profile also shows their pending ones.
  query = q.authorId ? query.eq("author_id", q.authorId) : query.in("status", ["approved", "reported"]);
  if (q.view === "photos") query = query.eq("kind", "photo");
  if (q.view === "videos") query = query.eq("kind", "video");
  if (q.view === "tips") query = query.eq("kind", "tip");
  if (q.view === "featured") query = query.eq("is_featured", true);
  if (q.recipeId) query = query.eq("recipe_id", q.recipeId).in("status", ["approved", "reported"]);
  if (q.challengeId) query = query.eq("challenge_id", q.challengeId).in("status", ["approved", "reported"]);
  const { data } = await query
    .order(q.authorId ? "created_at" : "approved_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * size, page * size);
  const rows = (data ?? []) as any[];
  return { items: rows.slice(0, size).map(mapPost), hasMore: rows.length > size };
}

export async function getPost(id: string): Promise<Post | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("community_posts").select(POST_SELECT).eq("id", id).maybeSingle();
  return data ? mapPost(data) : null;
}

export async function getMemberByUsername(username: string): Promise<MemberProfile | null> {
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) return null;
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select(`${MEMBER_SELECT}, bio, follower_count, following_count, show_saved, is_suspended, created_at`)
    .eq("username", username)
    .maybeSingle();
  if (!data) return null;
  const r = data as any;
  return {
    ...mapMember(r),
    bio: r.bio,
    followerCount: r.follower_count,
    followingCount: r.following_count,
    showSaved: r.show_saved,
    isSuspended: r.is_suspended,
    joinedAt: r.created_at,
  };
}

export async function getMemberById(id: string): Promise<MemberProfile | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
  return data ? getMemberByUsername(data.username) : null;
}

/** Recipes a member shared. Others see published ones; the member also sees drafts and pending ones. */
export async function listMemberRecipes(authorId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("recipes").select(RECIPE_CARD_SELECT).eq("author_id", authorId).order("updated_at", { ascending: false }).limit(60);
  return ((data ?? []) as any[]).map(mapRecipeCard);
}

export async function listSavedRecipes(userId: string) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("saved_recipes")
    .select(`created_at, recipe:recipes ( ${RECIPE_CARD_SELECT} )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as any[]).filter((r) => r.recipe && r.recipe.status === "published").map((r) => mapRecipeCard(r.recipe));
}

export async function listFollows(memberId: string, direction: "followers" | "following", page = 1) {
  const supabase = await db();
  if (!supabase) return { items: [] as MemberSummary[], hasMore: false };
  const size = 48;
  const col = direction === "followers" ? "followee_id" : "follower_id";
  const embed = direction === "followers" ? `member:profiles!follows_follower_id_fkey ( ${MEMBER_SELECT}, is_suspended )` : `member:profiles!follows_followee_id_fkey ( ${MEMBER_SELECT}, is_suspended )`;
  const { data } = await supabase
    .from("follows")
    .select(embed)
    .eq(col, memberId)
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size);
  const rows = ((data ?? []) as any[]).map((r) => r.member).filter((m) => m && !m.is_suspended);
  return { items: rows.slice(0, size).map(mapMember), hasMore: rows.length > size };
}

export async function featuredMembers(limit = 6): Promise<MemberSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("profiles").select(MEMBER_SELECT).eq("is_featured", true).eq("is_suspended", false).limit(limit);
  return ((data ?? []) as any[]).map(mapMember);
}

export async function recentMemberRecipes(limit = 8) {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("recipes")
    .select(RECIPE_CARD_SELECT)
    .eq("status", "published")
    .not("author_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map(mapRecipeCard);
}

export async function listChallenges(): Promise<{ current: Challenge[]; past: Challenge[]; upcoming: Challenge[] }> {
  const supabase = await db();
  if (!supabase) return { current: [], past: [], upcoming: [] };
  const { data } = await supabase.from("challenges").select("*").eq("status", "published").order("starts_on", { ascending: false }).limit(100);
  const today = new Date().toISOString().slice(0, 10);
  const all = ((data ?? []) as any[]).map(mapChallenge);
  return {
    current: all.filter((c) => c.startsOn <= today && c.endsOn >= today),
    upcoming: all.filter((c) => c.startsOn > today).reverse(),
    past: all.filter((c) => c.endsOn < today),
  };
}

export async function getChallenge(slug: string): Promise<Challenge | null> {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("challenges").select("*").eq("slug", slug).maybeSingle();
  return data ? mapChallenge(data) : null;
}

export async function listNotifications(page = 1): Promise<{ items: NotificationItem[]; hasMore: boolean }> {
  const supabase = await db();
  if (!supabase) return { items: [], hasMore: false };
  const size = 40;
  const { data } = await supabase
    .from("notifications")
    .select(`id, type, target_type, target_id, data, read_at, created_at, actor:profiles!notifications_actor_id_fkey ( ${MEMBER_SELECT} )`)
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size);
  const rows = (data ?? []) as any[];
  return {
    items: rows.slice(0, size).map((r) => ({
      id: r.id,
      type: r.type,
      targetType: r.target_type,
      targetId: r.target_id,
      data: r.data ?? {},
      readAt: r.read_at,
      createdAt: r.created_at,
      actor: r.actor ? mapMember(r.actor) : null,
    })),
    hasMore: rows.length > size,
  };
}

/** Where a notification should take the member. */
export async function notificationLinks(items: NotificationItem[]): Promise<Map<number, string>> {
  const supabase = await db();
  const links = new Map<number, string>();
  if (!supabase) return links;
  const recipeIds = new Set<string>();
  for (const n of items) {
    const rid = (n.data.recipe_id as string | undefined) ?? (n.targetType === "recipe" ? n.targetId : null);
    if (rid) recipeIds.add(rid);
  }
  const { data } = recipeIds.size ? await supabase.from("recipes").select("id, slug, kind, status").in("id", [...recipeIds]) : { data: [] };
  const recipes = new Map(((data ?? []) as any[]).map((r) => [r.id, r]));
  const recipeHref = (id: string | null | undefined, own = false) => {
    const r = id ? recipes.get(id) : null;
    if (!r) return "/account/contributions";
    if (r.status !== "published") return own ? `/submit/recipe/${r.id}` : "/account/contributions";
    return r.kind === "drink" ? `/drinks-tea/${r.slug}` : `/recipes/${r.slug}`;
  };
  for (const n of items) {
    const postId = n.data.post_id as string | undefined;
    let href = "/notifications";
    if (n.type === "follow" && n.actor) href = `/members/${n.actor.username}`;
    else if (n.targetType === "post") href = `/community/posts/${n.targetId}`;
    else if (n.targetType === "account") href = "/account";
    else if (postId) href = `/community/posts/${postId}#comments`;
    else if (n.targetType === "recipe") href = recipeHref(n.targetId, n.type === "moderation");
    else if (n.data.recipe_id) href = `${recipeHref(n.data.recipe_id as string)}#${n.type === "review" ? "reviews" : "comments"}`;
    links.set(n.id, href);
  }
  return links;
}

/** Latest approved photo posts for cached public pages (no visitor session). */
export async function latestPublicPhotos(limit = 6): Promise<Post[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await publicClient()
    .from("community_posts")
    .select(POST_SELECT)
    .in("status", ["approved", "reported"])
    .eq("kind", "photo")
    .order("approved_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map(mapPost);
}

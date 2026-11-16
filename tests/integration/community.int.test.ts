/**
 * Integration test: the community data functions and browser queries, run against
 * PostgREST (the API Supabase uses) on the test database after scripts/test-db.sh.
 * Catches wrong relationship names, columns and permissions that unit tests can't.
 */
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.JWT_SECRET ?? "test-secret-for-local-integration-only-0123456789";
const BEA = "00000000-0000-0000-0000-00000000000b";
const MOD = "00000000-0000-0000-0000-00000000000f";

function jwt(sub: string | null): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = b64({ role: sub ? "authenticated" : "anon", ...(sub ? { sub } : {}), exp: Math.floor(Date.now() / 1000) + 3600 });
  const head = b64({ alg: "HS256", typ: "JWT" });
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
}
const client = (sub: string | null): SupabaseClient =>
  createSupabase(URL_, jwt(sub), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${jwt(sub)}` } } });

let current: string | null = null;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client(current) }));

const server = await import("@/lib/community/server");
const q = await import("@/lib/community/queries");

beforeEach(() => {
  current = null;
});

describe("public pages (visitor)", () => {
  it("lists approved posts with author, media and recipe", async () => {
    const { items } = await server.listPosts({ view: "latest" });
    expect(items.length).toBe(1);
    const p = items[0];
    expect(p.status).toBe("approved");
    expect(p.author.username).toMatch(/^beamember/);
    expect(p.media[0].url).toContain("/storage/v1/object/public/community/");
    expect(p.recipe?.slug).toBe("beas-dal");
  });
  it("hides pending posts", async () => {
    const { items } = await server.listPosts({ view: "tips" });
    expect(items).toHaveLength(0);
  });
  it("sorts popular posts", async () => {
    const { items } = await server.listPosts({ view: "popular" });
    expect(items.map((p) => p.status)).toEqual(["approved"]);
  });
  it("opens a post", async () => {
    const { items } = await server.listPosts({});
    expect((await server.getPost(items[0].id))?.id).toBe(items[0].id);
    expect(await server.getPost("not-a-uuid")).toBeNull();
  });
  it("loads a member profile, recipes and favourites", async () => {
    const { data: row } = await client(null).from("profiles").select("username").eq("id", BEA).single();
    expect(row!.username).toMatch(/^beamember\d{4}$/);
    const m = await server.getMemberByUsername(row!.username);
    expect(m).toMatchObject({ displayName: "Bea Member", showSaved: true, isSuspended: false });
    const recipes = await server.listMemberRecipes(BEA);
    expect(recipes.map((r) => r.slug)).toContain("beas-dal");
    expect(recipes.every((r) => r.status === "published")).toBe(true);
    expect((await server.listSavedRecipes(BEA)).map((r) => r.slug)).toContain("gus-soup");
  });
  it("lists followers and following", async () => {
    const followers = await server.listFollows(BEA, "followers");
    const following = await server.listFollows(BEA, "following");
    expect(Array.isArray(followers.items) && Array.isArray(following.items)).toBe(true);
  });
  it("lists challenges", async () => {
    const c = await server.listChallenges();
    expect(c.current.map((x) => x.slug)).toContain("soup-week");
    expect(c.past.map((x) => x.slug)).toContain("old-challenge");
    expect((await server.getChallenge("soup-week"))?.title).toBe("Soup Week");
  });
  it("loads challenge entries and member recipes", async () => {
    const ch = await server.getChallenge("soup-week");
    await expect(server.listPosts({ challengeId: ch!.id })).resolves.toBeTruthy();
    expect((await server.recentMemberRecipes()).length).toBeGreaterThan(0);
    await expect(server.featuredMembers()).resolves.toEqual([]);
    expect((await server.latestPublicPhotos()).length).toBe(1);
  });
  it("runs the browser queries for comments, reviews and member photos", async () => {
    const db = client(null);
    const { data: dal } = await db.from("recipes").select("id").eq("slug", "beas-dal").single();
    const comments = await db.from("comments").select(q.COMMENT_SELECT).eq("recipe_id", dal!.id);
    const reviews = await db.from("recipe_reviews").select(q.REVIEW_SELECT).eq("recipe_id", dal!.id);
    const cooked = await db.from("community_posts").select(q.COOKED_SELECT).eq("recipe_id", dal!.id);
    expect(comments.error).toBeNull();
    expect(reviews.error).toBeNull();
    expect(cooked.error).toBeNull();
    expect(reviews.data!.length).toBe(1);
    expect(cooked.data!.length).toBe(1);
  });
  it("can't read notifications, blocks or reports", async () => {
    const db = client(null);
    expect((await db.from("notifications").select("id")).data).toEqual([]);
    expect((await db.from("reports").select("id")).data).toEqual([]);
  });
});

describe("signed-in member (Bea)", () => {
  beforeEach(() => {
    current = BEA;
  });
  it("sees own pending posts on her profile", async () => {
    const { items } = await server.listPosts({ authorId: BEA });
    expect(items.some((p) => p.status === "pending")).toBe(true);
  });
  it("lists notifications with links", async () => {
    const { items } = await server.listNotifications();
    expect(items.length).toBeGreaterThan(0);
    const links = await server.notificationLinks(items);
    for (const n of items) expect(links.get(n.id)).toMatch(/^\//);
    const { data: count, error } = await client(BEA).rpc("unread_notification_count");
    expect(error).toBeNull();
    expect(typeof count).toBe("number");
  });
  it("lists the members she blocked", async () => {
    const { error } = await client(BEA).from("blocks").select(q.BLOCKED_SELECT).eq("blocker_id", BEA);
    expect(error).toBeNull();
  });
  it("can comment, like and remove them through the API", async () => {
    const db = client(BEA);
    const { data: post } = await db.from("community_posts").select("id").eq("status", "approved").limit(1).single();
    const c = await db.from("comments").insert({ author_id: BEA, post_id: post!.id, body: "API comment" }).select("id").single();
    expect(c.error).toBeNull();
    expect((await db.from("likes").insert({ user_id: BEA, target_type: "comment", target_id: c.data!.id })).error?.message).toBeUndefined();
    expect((await db.from("comments").delete().eq("id", c.data!.id)).error).toBeNull();
  });
  it("is refused when acting for someone else", async () => {
    const { error } = await client(BEA).from("comments").insert({ author_id: MOD, recipe_id: null, post_id: null, body: "x" });
    expect(error).not.toBeNull();
  });
});

describe("moderator", () => {
  it("sees the review queue and can moderate through the RPC", async () => {
    const db = client(MOD);
    const recipes = await db.from("recipes").select(`id, title, author:profiles ( ${(await import("@/lib/community/types")).MEMBER_COLUMNS} )`).eq("status", "pending").not("author_id", "is", null);
    expect(recipes.error).toBeNull();
    const posts = await db.from("community_posts").select(server.POST_SELECT).eq("status", "pending");
    expect(posts.error).toBeNull();
    expect(posts.data!.length).toBeGreaterThan(5);
    const tip = (posts.data as unknown as { id: string }[])[0];
    expect((await db.rpc("moderate", { p_type: "post", p_id: tip.id, p_action: "approve", p_note: null })).error).toBeNull();
    const { data } = await db.from("community_posts").select("status").eq("id", tip.id).single();
    expect(data!.status).toBe("approved");
  });
  it("searches members", async () => {
    const { data, error } = await client(MOD).from("profiles").select("id, username").or("username.ilike.%bea%,display_name.ilike.%bea%");
    expect(error).toBeNull();
    expect(data!.length).toBe(1);
  });
  it("is refused when a member tries the moderation RPC", async () => {
    const { error } = await client(BEA).rpc("moderate", { p_type: "post", p_id: BEA, p_action: "remove", p_note: null });
    expect(error).not.toBeNull();
  });
});

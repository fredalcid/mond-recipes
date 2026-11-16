import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * "Download my data": everything the site holds about the signed-in member, as JSON
 * (a structured, commonly used format, as Quebec's right to data portability requires).
 * Reads through the member's own session, so Row Level Security limits it to their data.
 */
export async function GET() {
  const member = await getCurrentMember();
  const db = await createClient();
  if (!member || !db) return NextResponse.redirect(new URL("/sign-in?next=/account/export", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  const id = member.id;
  // A part that fails to load says so in the file instead of silently looking empty.
  const q = <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) =>
    Promise.resolve(p).then((r) => (r.error ? { error: "This part couldn't be loaded. Please try again or contact us." } : (r.data ?? [])));

  const [profile, recipes, posts, comments, reviews, likes, following, followers, blocks, saved, notifications, reports] = await Promise.all([
    db
      .from("profiles")
      .select("username, display_name, bio, avatar_path, country:countries ( name ), notification_prefs, show_saved, created_at")
      .eq("id", id)
      .maybeSingle()
      .then((r) => r.data),
    q(
      db
        .from("recipes")
        .select("title, slug, kind, status, summary, prep_minutes, cook_minutes, servings, tips, substitutions, created_at, updated_at, recipe_ingredients ( position, quantity, unit, note, ingredients ( name ) ), recipe_steps ( position, body )")
        .eq("author_id", id),
    ),
    q(db.from("community_posts").select("kind, body, status, created_at, post_media ( media_type, storage_path, youtube_id, alt )").eq("author_id", id)),
    q(db.from("comments").select("body, status, created_at, recipe_id, post_id").eq("author_id", id)),
    q(db.from("recipe_reviews").select("rating, body, status, created_at, recipe:recipes ( title )").eq("author_id", id)),
    q(db.from("likes").select("target_type, target_id, created_at").eq("user_id", id)),
    q(db.from("follows").select("created_at, member:profiles!follows_followee_id_fkey ( username )").eq("follower_id", id)),
    q(db.from("follows").select("created_at, member:profiles!follows_follower_id_fkey ( username )").eq("followee_id", id)),
    q(db.from("blocks").select("created_at, member:profiles!blocks_blocked_id_fkey ( username )").eq("blocker_id", id)),
    q(db.from("saved_recipes").select("created_at, recipe:recipes ( title, slug )").eq("user_id", id)),
    q(db.from("notifications").select("type, data, read_at, created_at").order("created_at", { ascending: false }).limit(1000)),
    q(db.from("reports").select("target_type, reason, details, status, created_at").eq("reporter_id", id)),
  ]);

  // Newsletter records are only readable with the server key.
  const service = createServiceClient();
  const newsletter = service
    ? await service.from("newsletter_subscribers").select("email, status, consent_text, consent_at, confirmed_at, unsubscribed_at, source").eq("email", member.email).then((r) => r.data ?? [])
    : "Not available here; ask us through the Contact page.";

  const body = {
    exported_at: new Date().toISOString(),
    about: "Your personal information held by Mònd Recipes. Uploaded photos and videos are listed by their storage path.",
    account: { email: member.email, email_confirmed: member.emailVerified, team_roles: member.roles },
    profile,
    recipes,
    community_posts: posts,
    comments,
    reviews,
    likes,
    following,
    followers,
    blocked_members: blocks,
    saved_recipes: saved,
    notifications,
    reports_you_made: reports,
    newsletter,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mond-recipes-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

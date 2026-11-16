import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

type Props = { searchParams: Promise<{ verified?: string; password?: string }> };

const roleLabels = { super_admin: "Super Admin", editor: "Editor", moderator: "Community Moderator" } as const;

export default async function AccountPage({ searchParams }: Props) {
  const member = await getCurrentMember();
  if (!member) return null; // the layout shows sign-in or "not connected"
  const { verified, password } = await searchParams;
  const db = await createClient();
  if (!db) return null;
  const [{ data: profile }, recipes, posts] = await Promise.all([
    db.from("profiles").select("username, follower_count, following_count, is_suspended, suspended_reason").eq("id", member.id).single(),
    db.from("recipes").select("status").eq("author_id", member.id),
    db.from("community_posts").select("status").eq("author_id", member.id),
  ]);
  const count = (rows: { status: string }[] | null, status: string) => (rows ?? []).filter((r) => r.status === status).length;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-semibold text-forest-900">My account</h1>
      {verified === "1" && <FormMessage tone="success">Your email is confirmed. Welcome to Mònd Recipes!</FormMessage>}
      {password === "updated" && <FormMessage tone="success">Your password has been changed.</FormMessage>}
      {!member.emailVerified && (
        <FormMessage tone="info">Confirm your email address to share recipes, post, comment and follow other cooks. Check your inbox for the link.</FormMessage>
      )}
      {profile?.is_suspended && (
        <FormMessage tone="error">
          Your account is suspended{profile.suspended_reason ? `: ${profile.suspended_reason}` : "."} You can still sign in and manage your data. Contact us if you think
          this is a mistake.
        </FormMessage>
      )}

      <section className="rounded-card border border-sand-strong bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-2xl font-semibold text-forest-900">Your details</h2>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-muted">Name</dt>
            <dd className="mt-1 font-semibold">{member.displayName}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Public profile</dt>
            <dd className="mt-1 font-semibold">
              {profile && (
                <Link href={`/members/${profile.username}`} className="text-forest-900 underline underline-offset-4">
                  @{profile.username}
                </Link>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Email</dt>
            <dd className="mt-1 font-semibold break-all">{member.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Email status</dt>
            <dd className="mt-1">{member.emailVerified ? <Badge tone="editorial">Confirmed</Badge> : <Badge tone="sample">Not confirmed</Badge>}</dd>
          </div>
          {member.roles.length > 0 && (
            <div>
              <dt className="text-sm text-ink-muted">Team role</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {member.roles.map((r) => (
                  <Badge key={r} tone="verified">
                    {roleLabels[r]}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/profile" className="inline-flex min-h-11 items-center rounded-full border border-forest-900 px-5 text-sm font-semibold text-forest-900 hover:bg-sand">
            Edit profile
          </Link>
          <Link href="/update-password" className="inline-flex min-h-11 items-center rounded-full border border-sand-strong px-5 text-sm font-semibold hover:bg-sand">
            Change password
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Published recipes" value={count(recipes.data, "published")} href="/account/contributions" />
        <Stat label="Recipes in review" value={count(recipes.data, "pending")} href="/account/contributions" />
        <Stat label="Approved posts" value={count(posts.data, "approved") + count(posts.data, "reported")} href="/account/contributions" />
        <Stat label="Followers" value={profile?.follower_count ?? 0} href={profile ? `/members/${profile.username}/followers` : "/account"} />
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/submit/recipe" className="inline-flex min-h-12 items-center rounded-full bg-forest-900 px-6 font-semibold text-cream hover:bg-forest-800">
          Share a recipe
        </Link>
        <Link href="/community/new" className="inline-flex min-h-12 items-center rounded-full bg-gold-500 px-6 font-semibold text-forest-950 hover:bg-gold-600">
          Post a photo, video or tip
        </Link>
      </section>

      <form action="/auth/sign-out" method="post">
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-card border border-sand-strong bg-white p-5 hover:border-forest-900">
      <span className="block text-3xl font-semibold text-forest-900 tabular-nums">{value}</span>
      <span className="text-sm text-ink-muted">{label}</span>
    </Link>
  );
}

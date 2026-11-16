import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCurrentMember } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

// Always rendered per request: it shows the signed-in member's own details.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ verified?: string; password?: string }> };

const roleLabels = { super_admin: "Super Admin", editor: "Editor", moderator: "Community Moderator" } as const;

export default async function AccountPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/account");
  const { verified, password } = await searchParams;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-semibold text-forest-900">My account</h1>
        <div className="mt-6 flex flex-col gap-3">
          {verified === "1" && <FormMessage tone="success">Your email is confirmed. Welcome to Mònd Recipes!</FormMessage>}
          {password === "updated" && <FormMessage tone="success">Your password has been changed.</FormMessage>}
        </div>

        <section aria-labelledby="profile-heading" className="mt-8 rounded-[1.5rem] border border-sand-strong bg-white p-6 shadow-card sm:p-8">
          <h2 id="profile-heading" className="text-2xl font-semibold text-forest-900">Your details</h2>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-muted">Name</dt>
              <dd className="mt-1 font-semibold">{member.displayName}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Email</dt>
              <dd className="mt-1 font-semibold break-all">{member.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Email status</dt>
              <dd className="mt-1">
                {member.emailVerified ? <Badge tone="editorial">Confirmed</Badge> : <Badge tone="sample">Not confirmed</Badge>}
              </dd>
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
          <p className="mt-8 text-sm text-ink-muted">
            Profile editing, saved recipes, notification settings and account deletion are added with the community in Phase 4.
          </p>
        </section>

        <form action="/auth/sign-out" method="post" className="mt-8">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </Container>
  );
}

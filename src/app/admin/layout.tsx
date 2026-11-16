import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { Suspense } from "react";
import { canEditContent, canManageMembers, canModerate, isStaff } from "@/lib/admin";
import { AdminNav, type NavGroup } from "@/components/admin/AdminNav";

const ROLE_LABEL = { super_admin: "Super admin", editor: "Editor", moderator: "Community moderator" } as const;
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Mònd Recipes" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <Container className="py-16">
        <h1 className="text-3xl font-semibold text-forest-900">Admin</h1>
        <div className="mt-6 max-w-xl">
          <FormMessage tone="info">The admin opens once the database is connected. Follow “Set up Supabase” in the README.</FormMessage>
        </div>
      </Container>
    );
  }
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/admin");
  // Non-staff get a plain 404 so the admin area isn't advertised.
  if (!isStaff(member)) notFound();

  const editor = canEditContent(member);
  const moderator = canModerate(member);
  const superAdmin = member.roles.includes("super_admin");
  const groups: NavGroup[] = [
    { title: "Overview", links: [["/admin", "Dashboard"], ["/admin/analytics", "Analytics"]] },
    ...(editor
      ? [
          {
            title: "Content",
            links: [
              ["/admin/recipes", "Recipes"],
              ["/admin/recipes?kind=drink", "Drinks & Tea"],
              ["/admin/countries", "Countries"],
              ["/admin/taxonomy", "Categories & ingredients"],
              ["/admin/articles", "Articles"],
              ["/admin/videos", "Videos"],
              ["/admin/shop", "Shop"],
            ] as [string, string][],
          },
        ]
      : []),
    ...(moderator
      ? [
          {
            title: "Community",
            links: [
              ["/admin/moderation", "Moderation"],
              ["/admin/reviews", "Reviews"],
              ["/admin/challenges", "Challenges"],
              ...(canManageMembers(member) ? ([["/admin/members", "Members"]] as [string, string][]) : []),
            ] as [string, string][],
          },
        ]
      : []),
    ...(editor || superAdmin
      ? [
          {
            title: "Website",
            links: [
              ["/admin/seo", "SEO"],
              ...(superAdmin
                ? ([
                    ["/admin/settings", "Settings"],
                    ["/admin/ads", "Advertising"],
                    ["/admin/newsletter", "Newsletter"],
                    ["/admin/audit", "Audit log"],
                  ] as [string, string][])
                : []),
            ] as [string, string][],
          },
        ]
      : []),
  ];

  return (
    <div className="border-t border-sand-strong bg-white">
      <Container className="flex flex-col gap-3 border-b border-sand py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-forest-900">Admin</span>
          <span className="text-ink-muted">
            Signed in as {member.displayName} ({member.roles.map((r) => ROLE_LABEL[r]).join(", ")})
          </span>
        </div>
        <Suspense>
          <AdminNav groups={groups} />
        </Suspense>
      </Container>
      <div className="bg-ivory">{children}</div>
    </div>
  );
}

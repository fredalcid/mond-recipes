import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { isStaff } from "@/lib/admin";
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

  return (
    <div className="border-t border-sand-strong bg-white">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-sand py-3 text-sm">
        <span className="font-semibold text-forest-900">Admin</span>
        <nav aria-label="Admin">
          <ul className="flex flex-wrap gap-1">
            {[
              ["/admin", "Dashboard"],
              ["/admin/recipes", "Recipes"],
              ["/admin/articles", "Articles"],
              ["/admin/videos", "Videos"],
              ["/admin/shop", "Shop"],
              ...(member.roles.includes("super_admin")
                ? [
                    ["/admin/ads", "Advertising"],
                    ["/admin/newsletter", "Newsletter"],
                  ]
                : []),
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-10 items-center rounded-full px-3 font-medium hover:bg-sand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <span className="ml-auto text-ink-muted">
          Signed in as {member.displayName} ({member.roles.join(", ").replace("_", " ")})
        </span>
      </Container>
      <div className="bg-ivory">{children}</div>
    </div>
  );
}

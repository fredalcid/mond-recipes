import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent, canModerate } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Stats = Record<string, number | string>;

/** Real counts from the database at the moment the page opens. Nothing is estimated. */
export default async function AdminDashboard() {
  const member = (await getCurrentMember())!;
  const db = (await createClient())!;
  const [{ data, error }, { data: indexing }] = await Promise.all([
    db.rpc("admin_dashboard_stats"),
    db.from("site_settings").select("value").eq("key", "seo.allow_indexing").maybeSingle(),
  ]);
  const s = (data ?? {}) as Stats;
  const n = (k: string) => Number(s[k] ?? 0);
  const editor = canEditContent(member);
  const moderator = canModerate(member);
  const superAdmin = member.roles.includes("super_admin");
  const toModerate = n("recipes_pending") + n("posts_pending") + n("reports_open");

  const groups: { title: string; items: [string, number, string?, string?][] }[] = [
    {
      title: "Recipes",
      items: [
        ["Total recipes", n("recipes_total"), "/admin/recipes"],
        ["Published", n("recipes_published"), "/admin/recipes?status=published"],
        ["Waiting for review", n("recipes_pending"), moderator ? "/admin/moderation?tab=recipes" : undefined],
        ["Drafts", n("recipes_draft"), "/admin/recipes?status=draft"],
        ["Published drinks & teas", n("drinks_published"), "/admin/recipes?kind=drink"],
        ["Published member recipes", n("recipes_member")],
        ["Countries with recipes", n("countries_with_recipes"), editor ? "/admin/countries" : undefined],
        ["Ingredients", n("ingredients_total"), editor ? "/admin/taxonomy?tab=ingredients" : undefined],
      ],
    },
    {
      title: "Community",
      items: [
        ["Registered members", n("members_total"), superAdmin || member.roles.includes("moderator") ? "/admin/members" : undefined],
        ["Active members (30 days)", n("members_active_30d"), undefined, "Posted, commented, reviewed, liked, followed, saved or shared a recipe"],
        ["New members (30 days)", n("members_new_30d")],
        ["Community posts", n("posts_approved"), "/community"],
        ["Posts waiting for review", n("posts_pending"), moderator ? "/admin/moderation?tab=posts" : undefined],
        ["Open reports", n("reports_open"), moderator ? "/admin/moderation?tab=reports" : undefined],
        ["Reviews", n("reviews_total"), moderator ? "/admin/reviews" : undefined],
        ["Suspended members", n("members_suspended"), superAdmin || member.roles.includes("moderator") ? "/admin/members?filter=suspended" : undefined],
      ],
    },
    {
      title: "Content and business",
      items: [
        ["Published articles", n("articles_published"), editor ? "/admin/articles" : undefined, `${n("articles_total")} in total`],
        ["Published videos", n("videos_published"), editor ? "/admin/videos" : undefined, `${n("videos_total")} in total`],
        ["Products in the shop", n("products_active"), editor ? "/admin/shop" : undefined, `${n("products_total")} in total`],
        ["Shop clicks (30 days)", n("clicks_30d"), editor ? "/admin/shop" : undefined, "Visits to retailers, not sales"],
        ["Newsletter subscribers", n("subscribers_confirmed"), superAdmin ? "/admin/newsletter" : undefined, `${n("subscribers_pending")} waiting to confirm`],
        ["Ad placements on", n("ads_enabled"), superAdmin ? "/admin/ads" : undefined, `of ${n("ads_total")}`],
      ],
    },
  ];

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          {editor && (
            <Link href="/admin/recipes/new" className="inline-flex min-h-11 items-center rounded-full bg-forest-900 px-5 font-semibold text-cream hover:bg-forest-800">
              New recipe
            </Link>
          )}
          <Link href="/admin/analytics" className="inline-flex min-h-11 items-center rounded-full border border-forest-900 px-5 font-semibold text-forest-900 hover:bg-sand">
            Analytics
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {error && <FormMessage tone="error">Statistics couldn&apos;t be loaded. Make sure database update 0007 has been applied.</FormMessage>}
        {indexing?.value !== true && (
          <FormMessage tone="info">
            Search engines are blocked from the whole site (good while you prepare it).{" "}
            {superAdmin ? (
              <Link href="/admin/seo" className="font-semibold underline">
                Allow indexing in SEO settings
              </Link>
            ) : (
              "A super admin can allow indexing in SEO settings"
            )}{" "}
            when you&apos;re ready to launch.
          </FormMessage>
        )}
        {moderator && toModerate > 0 && (
          <FormMessage tone="info">
            <Link href="/admin/moderation" className="font-semibold underline">
              {toModerate} {toModerate === 1 ? "item needs" : "items need"} moderation
            </Link>{" "}
            ({n("recipes_pending")} recipes, {n("posts_pending")} posts, {n("reports_open")} reports).
          </FormMessage>
        )}
        {editor && n("products_broken") > 0 && (
          <FormMessage tone="error">
            <Link href="/admin/shop" className="font-semibold underline">
              {n("products_broken")} shop {n("products_broken") === 1 ? "link is" : "links are"} broken
            </Link>
            .
          </FormMessage>
        )}
        {n("recipes_sample") > 0 && <FormMessage tone="info">{n("recipes_sample")} sample recipes are still in the database. Remove them before launch (see the README).</FormMessage>}
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-10" aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="mb-4 text-2xl font-semibold text-forest-900">
            {g.title}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.items.map(([label, value, href, note]) => (
              <div key={label} className="rounded-card border border-sand-strong bg-white p-5">
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="mt-1 font-display text-3xl font-semibold text-forest-900 tabular-nums">
                  {href ? (
                    <Link href={href} className="hover:underline">
                      {value.toLocaleString("en-CA")}
                    </Link>
                  ) : (
                    value.toLocaleString("en-CA")
                  )}
                </dd>
                {note && <dd className="mt-1 text-xs text-ink-muted">{note}</dd>}
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="mt-8 text-sm text-ink-muted">
        Counted {s.generated_at ? new Date(String(s.generated_at)).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "now"}. Visitor numbers
        (page views) come from Google Analytics once it is set up; the site itself doesn&apos;t track visitors.
      </p>
    </Container>
  );
}

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { MiniBarChart } from "@/components/admin/MiniBarChart";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90, 365];
type Row = { day: string; new_members: number; recipes_published: number; posts_approved: number; comments: number; reviews: number; saves: number; clicks: number; subscribers: number };
const SERIES: [keyof Row, string][] = [
  ["new_members", "New members"],
  ["recipes_published", "Recipes published"],
  ["saves", "Recipes saved"],
  ["reviews", "Reviews"],
  ["comments", "Comments"],
  ["posts_approved", "Community posts"],
  ["clicks", "Shop clicks"],
  ["subscribers", "Newsletter confirmations"],
];

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const d = Number((await searchParams).days);
  const days = PERIODS.includes(d) ? d : 30;
  const db = (await createClient())!;
  const [{ data: series, error }, saved, rated, clicks, countries] = await Promise.all([
    db.rpc("admin_activity_series", { p_days: days }),
    db.from("recipes").select("title, slug, kind, save_count").eq("status", "published").gt("save_count", 0).order("save_count", { ascending: false }).limit(10),
    db.from("recipes").select("title, slug, kind, rating_average, rating_count").eq("status", "published").gte("rating_count", 3).order("rating_average", { ascending: false }).limit(10),
    db.rpc("product_click_report", { p_days: days }),
    db.from("recipe_countries").select("countries ( name, slug ), recipes!inner ( status )").eq("recipes.status", "published").limit(5000),
  ]);
  const rows = (series ?? []) as Row[];
  // Long periods are grouped by week so the columns stay readable.
  const bucket = days > 90 ? 7 : 1;
  const points = (key: keyof Row) => {
    const out: { label: string; value: number }[] = [];
    for (let i = 0; i < rows.length; i += bucket) {
      const chunk = rows.slice(i, i + bucket);
      const label = new Date(chunk[0].day + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
      out.push({ label: bucket > 1 ? `Week of ${label}` : label, value: chunk.reduce((s, r) => s + Number(r[key] ?? 0), 0) });
    }
    return out;
  };
  const countryCounts = new Map<string, { name: string; slug: string; n: number }>();
  for (const r of (countries.data ?? []) as any[]) {
    if (!r.countries) continue;
    const c = countryCounts.get(r.countries.slug) ?? { ...r.countries, n: 0 };
    c.n += 1;
    countryCounts.set(r.countries.slug, c);
  }
  const topCountries = [...countryCounts.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  const topClicks = ((clicks.data ?? []) as any[]).filter((r) => Number(r.clicks) > 0).sort((a, b) => Number(b.clicks) - Number(a.clicks)).slice(0, 10);
  const href = (r: any) => (r.kind === "drink" ? `/drinks-tea/${r.slug}` : `/recipes/${r.slug}`);

  return (
    <Container className="py-10">
      <AdminHeader title="Analytics">
        <nav aria-label="Period" className="flex gap-1">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/analytics?days=${p}`} aria-current={p === days ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold ${p === days ? "bg-forest-900 text-cream" : "bg-white hover:bg-sand"}`}>
              {p === 365 ? "1 year" : `${p} days`}
            </Link>
          ))}
        </nav>
      </AdminHeader>
      <p className="mb-6 max-w-3xl text-sm text-ink-muted">
        Activity counted from the site&apos;s own database, day by day{bucket > 1 ? " (grouped by week)" : ""}. Shop clicks are visits to retailers, not sales. Page views and visitor numbers
        are not collected by the site; they appear in Google Analytics once it is set up and visitors accept analytics cookies.
      </p>
      {error ? (
        <p className="text-danger">Analytics couldn&apos;t be loaded. Make sure database update 0007 has been applied.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SERIES.map(([key, label]) => (
            <MiniBarChart key={key} title={label} points={points(key)} />
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="mb-3 text-2xl font-semibold text-forest-900">Most saved recipes</h2>
          <Table head={["Recipe", "Saves"]} empty={(saved.data ?? []).length === 0 && "No saves yet."}>
            {(saved.data ?? []).map((r: any) => (
              <tr key={r.slug}>
                <td className="px-4 py-2">
                  <Link href={href(r)} className="text-forest-900 hover:underline">{r.title}</Link>
                </td>
                <td className="px-4 py-2 tabular-nums">{r.save_count}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 text-2xl font-semibold text-forest-900">Best rated recipes</h2>
          <Table head={["Recipe", "Rating", "Reviews"]} empty={(rated.data ?? []).length === 0 && "No recipe has 3 or more reviews yet."}>
            {(rated.data ?? []).map((r: any) => (
              <tr key={r.slug}>
                <td className="px-4 py-2">
                  <Link href={href(r)} className="text-forest-900 hover:underline">{r.title}</Link>
                </td>
                <td className="px-4 py-2 tabular-nums">{Number(r.rating_average).toFixed(1)}</td>
                <td className="px-4 py-2 tabular-nums">{r.rating_count}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 text-2xl font-semibold text-forest-900">Most clicked products</h2>
          <Table head={["Product", "Clicks"]} empty={topClicks.length === 0 && `No shop clicks in the last ${days} days.`}>
            {topClicks.map((r: any) => (
              <tr key={r.product_id}>
                <td className="px-4 py-2">
                  <Link href={`/admin/shop/${r.product_id}`} className="text-forest-900 hover:underline">{r.name ?? r.slug ?? "Product"}</Link>
                </td>
                <td className="px-4 py-2 tabular-nums">{r.clicks}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="min-w-0">
          <h2 className="mb-3 text-2xl font-semibold text-forest-900">Countries with the most recipes</h2>
          <Table head={["Country", "Published recipes"]} empty={topCountries.length === 0 && "No published recipes yet."}>
            {topCountries.map((c) => (
              <tr key={c.slug}>
                <td className="px-4 py-2">
                  <Link href={`/admin/countries/${c.slug}`} className="text-forest-900 hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-2 tabular-nums">{c.n}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </Container>
  );
}

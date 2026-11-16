import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

/** Real counts straight from the database; nothing here is estimated. */
export default async function AdminDashboard() {
  const supabase = (await createClient())!;
  const count = async (table: string, column?: string, value?: string | boolean) => {
    const base = supabase.from(table).select("*", { count: "exact", head: true });
    const { count: n } = column ? await base.eq(column, value as string) : await base;
    return n ?? 0;
  };
  const [total, published, pending, drafts, drinks, samples, countriesIndexed, ingredients] = await Promise.all([
    count("recipes"),
    count("recipes", "status", "published"),
    count("recipes", "status", "pending"),
    count("recipes", "status", "draft"),
    count("recipes", "kind", "drink"),
    count("recipes", "is_sample", true),
    count("countries", "is_indexable", true),
    count("ingredients"),
  ]);

  const stats: [string, number, string?][] = [
    ["Total recipes", total],
    ["Published", published],
    ["Waiting for review", pending, "/admin/recipes?status=pending"],
    ["Drafts", drafts, "/admin/recipes?status=draft"],
    ["Drinks", drinks],
    ["Sample recipes", samples],
    ["Countries open to Google", countriesIndexed],
    ["Ingredients", ingredients],
  ];

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">Dashboard</h1>
        <LinkButton href="/admin/recipes/new">New recipe</LinkButton>
      </div>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, href]) => (
          <div key={label} className="rounded-card border border-sand-strong bg-white p-5">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold text-forest-900">
              {href ? (
                <Link href={href} className="hover:underline">
                  {value.toLocaleString("en-CA")}
                </Link>
              ) : (
                value.toLocaleString("en-CA")
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-ink-muted">Member, community, shop, newsletter and advertising figures are added with those features.</p>
    </Container>
  );
}

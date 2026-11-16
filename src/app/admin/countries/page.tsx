import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AdminHeader, Table } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { TextInput } from "@/components/admin/fields";
import { CountryFlag } from "@/components/cards/CountryCard";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { addCountry } from "./actions";

export const metadata = { title: "Countries" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; filter?: string }> };
type Row = { id: number; slug: string; name: string; iso2: string; is_featured: boolean; is_indexable: boolean; intro: string | null; hero_image_path: string | null; regions: { count: number }[]; recipe_countries: { count: number }[] };

export default async function CountriesAdmin({ searchParams }: Props) {
  if (!canEditContent(await getCurrentMember())) notFound();
  const { q = "", filter = "" } = await searchParams;
  const db = (await createClient())!;
  let query = db.from("countries").select("id, slug, name, iso2, is_featured, is_indexable, intro, hero_image_path, regions ( count ), recipe_countries ( count )").order("name");
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_,()]/g, "")}%`);
  if (filter === "featured") query = query.eq("is_featured", true);
  if (filter === "indexed") query = query.eq("is_indexable", true);
  const { data } = await query;
  let rows = (data ?? []) as Row[];
  const recipeCount = (r: Row) => r.recipe_countries?.[0]?.count ?? 0;
  if (filter === "with-recipes") rows = rows.filter((r) => recipeCount(r) > 0);
  if (filter === "needs-content") rows = rows.filter((r) => recipeCount(r) > 0 && (!r.intro || !r.hero_image_path));

  return (
    <Container className="py-10">
      <AdminHeader title="Countries" />
      <form className="mb-6 flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Find a country</span>
          <input name="q" defaultValue={q} className="min-h-11 w-64 max-w-full rounded-xl border border-sand-strong px-3" />
        </label>
        <select name="filter" defaultValue={filter} aria-label="Show" className="min-h-11 rounded-xl border border-sand-strong bg-white px-3">
          <option value="">All {rows.length > 0 ? "" : ""}countries</option>
          <option value="with-recipes">With recipes</option>
          <option value="needs-content">With recipes but missing intro or photo</option>
          <option value="featured">Featured on the homepage</option>
          <option value="indexed">Open to search engines</option>
        </select>
        <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream">
          Show
        </button>
      </form>
      <Table head={["Country", "Recipes", "Regions", "Featured", "Search engines"]} empty={rows.length === 0 && "No countries match."}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-2">
              <Link href={`/admin/countries/${r.slug}`} className="inline-flex items-center gap-2 font-semibold text-forest-900 hover:underline">
                <CountryFlag iso2={r.iso2} name={r.name} className="h-4 w-6" />
                {r.name}
              </Link>
            </td>
            <td className="px-4 py-2 tabular-nums">{recipeCount(r)}</td>
            <td className="px-4 py-2 tabular-nums">{r.regions?.[0]?.count ?? 0}</td>
            <td className="px-4 py-2">{r.is_featured ? "Yes" : ""}</td>
            <td className="px-4 py-2">{r.is_indexable ? "Indexed" : <span className="text-ink-muted">Hidden</span>}</td>
          </tr>
        ))}
      </Table>
      <section className="mt-10 max-w-2xl rounded-card border border-sand-strong bg-white p-5">
        <h2 className="mb-2 text-2xl font-semibold text-forest-900">Add a country or territory</h2>
        <p className="mb-4 text-sm text-ink-muted">All 249 ISO countries and territories are already included. Add one only if it&apos;s missing.</p>
        <AdminForm action={addCountry} submitLabel="Add country">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput name="name" label="Name" required />
            <TextInput name="iso2" label="Two-letter code" required maxLength={2} />
            <TextInput name="slug" label="Web address" hint="e.g. south-sudan" required />
          </div>
        </AdminForm>
      </section>
    </Container>
  );
}

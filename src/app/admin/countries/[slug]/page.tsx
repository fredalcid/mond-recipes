import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/Field";
import { AdminHeader } from "@/components/admin/AdminBits";
import { AdminForm } from "@/components/admin/AdminForm";
import { Checkbox, Panel, TextArea, TextInput } from "@/components/admin/fields";
import { CountryFlag } from "@/components/cards/CountryCard";
import { getCurrentMember } from "@/lib/auth";
import { canEditContent } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/data/supabase-source";
import { deleteRegion, saveAliases, saveCountry, saveCountryCuisines, saveFeaturedRecipes, saveRegion } from "../actions";

export const metadata = { title: "Edit country" };
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> };
const small = "min-h-10 rounded-full px-4 text-sm font-semibold";

function Preview({ url, label }: { url: string | null; label: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin preview
    <img src={url} alt={label} className="h-20 rounded-lg border border-sand object-cover" />
  ) : (
    <p className="text-sm text-ink-muted">None yet.</p>
  );
}

export default async function EditCountry({ params, searchParams }: Props) {
  if (!canEditContent(await getCurrentMember())) notFound();
  const { slug } = await params;
  const { saved } = await searchParams;
  const db = await createClient();
  if (!db) return null;
  const { data: c } = await db
    .from("countries")
    .select("*, regions ( id, slug, name, description, display_order ), country_aliases ( alias ), country_cuisines ( cuisine_id ), country_featured_recipes ( recipe_id, position )")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) notFound();
  const country = c as any;
  const [{ data: cuisines }, { data: recipes }] = await Promise.all([
    db.from("cuisines").select("id, name").order("name"),
    db.from("recipe_countries").select("recipes!inner ( id, title, kind, status )").eq("country_id", country.id).eq("recipes.status", "published").limit(300),
  ]);
  const linked = new Set((country.country_cuisines ?? []).map((x: any) => x.cuisine_id));
  const featured = [...(country.country_featured_recipes ?? [])].sort((a: any, b: any) => a.position - b.position).map((f: any) => f.recipe_id as string);
  const recipeList = ((recipes ?? []) as any[]).map((r) => r.recipes).sort((a, b) => (featured.indexOf(a.id) + 1 || 99) - (featured.indexOf(b.id) + 1 || 99) || a.title.localeCompare(b.title));
  const regions = [...(country.regions ?? [])].sort((a: any, b: any) => a.display_order - b.display_order || a.name.localeCompare(b.name));
  const hidden = (
    <>
      <input type="hidden" name="country_id" value={country.id} />
      <input type="hidden" name="country_slug" value={country.slug} />
    </>
  );

  return (
    <Container className="max-w-4xl py-10">
      <AdminHeader title={country.name}>
        <Link href={`/countries/${country.slug}`} className="font-semibold text-forest-900 underline underline-offset-4">
          View page →
        </Link>
      </AdminHeader>
      {saved && (
        <div className="mb-6">
          <FormMessage tone={/not saved|already/i.test(saved) ? "error" : "success"}>{saved}</FormMessage>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <AdminForm action={saveCountry} submitLabel="Save country" multipart>
          <input type="hidden" name="id" value={country.id} />
          <input type="hidden" name="slug" value={country.slug} />
          <Panel title="Details">
            <TextInput name="name" label="Name" defaultValue={country.name} required />
            <p className="text-sm text-ink-muted">
              Web address: /countries/{country.slug} · Code: {country.iso2}
            </p>
            <TextArea name="intro" label="Short introduction" defaultValue={country.intro} rows={3} maxLength={600} hint="Shown on country cards and at the top of the page." />
            <TextArea name="food_culture" label="Food culture" defaultValue={country.food_culture} rows={10} maxLength={8000} hint="Original writing about the country's cooking. Paragraphs are separated by a blank line." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Checkbox name="is_featured" label="Feature on the homepage" defaultChecked={country.is_featured} />
              <Checkbox name="is_indexable" label="Open to search engines" defaultChecked={country.is_indexable} />
              <TextInput name="display_order" label="Order among featured" type="number" defaultValue={country.display_order} />
            </div>
            <p className="text-xs text-ink-muted">Open a country page to search engines only once it has real recipes and original writing; thin pages can hurt the whole site in Google.</p>
          </Panel>
          <Panel title="Images">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="f-hero" className="text-sm font-semibold">
                  Main photo
                </label>
                <Preview url={publicImageUrl(country.hero_image_path)} label="Current main photo" />
                <input id="f-hero" name="hero" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
                {country.hero_image_path && <Checkbox name="remove_hero" label="Remove photo" />}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Flag</span>
                <CountryFlag iso2={country.iso2} name={country.name} src={publicImageUrl(country.flag_path)} className="h-12 w-18" />
                <label htmlFor="f-flag" className="text-xs text-ink-muted">
                  {country.flag_path ? "Uploaded flag in use." : "The built-in flag for this code is used."} Upload an SVG or PNG to replace it.
                </label>
                <input id="f-flag" name="flag" type="file" accept="image/svg+xml,image/png,image/webp" className="text-sm" />
                {country.flag_path && <Checkbox name="remove_flag" label="Use the built-in flag again" />}
              </div>
            </div>
            <p className="text-xs text-ink-muted">Only use photos you own or are licensed to use.</p>
          </Panel>
          <Panel title="Search engines and sharing">
            <TextInput name="seo_title" label="Search title (optional)" defaultValue={country.seo_title} maxLength={70} />
            <TextArea name="meta_description" label="Search description (optional)" defaultValue={country.meta_description} rows={2} maxLength={300} />
            <TextInput name="canonical_url" label="Canonical address (optional)" defaultValue={country.canonical_url} hint="Only if this page's content lives at another address. Usually leave empty." />
            <div className="flex flex-col gap-2">
              <label htmlFor="f-og" className="text-sm font-semibold">
                Social sharing image (optional)
              </label>
              <Preview url={publicImageUrl(country.og_image_path)} label="Current sharing image" />
              <input id="f-og" name="og" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
              <p className="text-xs text-ink-muted">1200 × 630 pixels works best. If empty, the main photo is used.</p>
              {country.og_image_path && <Checkbox name="remove_og" label="Remove sharing image" />}
            </div>
          </Panel>
        </AdminForm>

        <section id="featured">
          <Panel title="Featured recipes">
            <p className="text-sm text-ink-muted">Shown first on the country page as “Editors&apos; picks”, in the order listed. Up to 12 published recipes from this country.</p>
            <form action={saveFeaturedRecipes} className="flex flex-col gap-3">
              {hidden}
              {recipeList.length === 0 ? (
                <p className="text-sm">No published recipes from {country.name} yet.</p>
              ) : (
                <div className="grid max-h-80 gap-x-4 overflow-y-auto rounded-xl border border-sand bg-white p-2 sm:grid-cols-2">
                  {recipeList.map((r) => (
                    <Checkbox key={r.id} name="recipe" value={r.id} label={`${r.title}${r.kind === "drink" ? " (drink)" : ""}`} defaultChecked={featured.includes(r.id)} />
                  ))}
                </div>
              )}
              <button type="submit" className={`${small} self-start bg-forest-900 text-cream`}>
                Save featured recipes
              </button>
            </form>
          </Panel>
        </section>

        <section id="cuisines">
          <Panel title="Cuisines">
            <p className="text-sm text-ink-muted">Cuisines that belong to this country. They are shown on the country page together with the cuisines of its recipes. Add new cuisines in Categories.</p>
            <form action={saveCountryCuisines} className="flex flex-col gap-3">
              {hidden}
              <div className="grid max-h-72 gap-x-4 overflow-y-auto rounded-xl border border-sand bg-white p-2 sm:grid-cols-3">
                {(cuisines ?? []).map((cu) => (
                  <Checkbox key={cu.id} name="cuisine" value={String(cu.id)} label={cu.name} defaultChecked={linked.has(cu.id)} />
                ))}
              </div>
              <button type="submit" className={`${small} self-start bg-forest-900 text-cream`}>
                Save cuisines
              </button>
            </form>
          </Panel>
        </section>

        <section id="regions">
          <Panel title="Regions">
            {regions.map((g: any) => (
              <details key={g.id} className="rounded-xl border border-sand bg-white p-4">
                <summary className="cursor-pointer font-semibold text-forest-900">{g.name}</summary>
                <form action={saveRegion} className="mt-3 flex flex-col gap-3">
                  {hidden}
                  <input type="hidden" name="id" value={g.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <TextInput name="name" label="Name" defaultValue={g.name} required />
                    <TextInput name="slug" label="Web address" defaultValue={g.slug} required />
                    <TextInput name="display_order" label="Order" type="number" defaultValue={g.display_order} />
                  </div>
                  <TextArea name="description" label="Description" defaultValue={g.description} rows={3} maxLength={2000} />
                  <div className="flex gap-2">
                    <button type="submit" className={`${small} bg-forest-900 text-cream`}>
                      Save region
                    </button>
                  </div>
                </form>
                <form action={deleteRegion} className="mt-2">
                  {hidden}
                  <input type="hidden" name="id" value={g.id} />
                  <button type="submit" className={`${small} text-danger hover:bg-sand`}>
                    Delete region
                  </button>
                </form>
              </details>
            ))}
            <form action={saveRegion} className="flex flex-col gap-3 rounded-xl border border-dashed border-sand-strong p-4">
              {hidden}
              <p className="font-semibold">Add a region</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput name="name" label="Name" required />
                <TextInput name="slug" label="Web address" hint="e.g. punjab" required />
                <TextInput name="display_order" label="Order" type="number" defaultValue={0} />
              </div>
              <TextArea name="description" label="Description" rows={2} maxLength={2000} />
              <button type="submit" className={`${small} self-start bg-forest-900 text-cream`}>
                Add region
              </button>
            </form>
          </Panel>
        </section>

        <section id="aliases">
          <Panel title="Other names">
            <form action={saveAliases} className="flex flex-col gap-3">
              {hidden}
              <TextArea
                name="aliases"
                label="Other names people search for"
                defaultValue={(country.country_aliases ?? []).map((a: any) => a.alias).join("\n")}
                rows={4}
                hint="One per line, e.g. Bharat, Hindustan. Used by search."
              />
              <button type="submit" className={`${small} self-start bg-forest-900 text-cream`}>
                Save other names
              </button>
            </form>
          </Panel>
        </section>
      </div>
    </Container>
  );
}

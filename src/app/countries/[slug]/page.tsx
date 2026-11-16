import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { CountryFlag } from "@/components/cards/CountryCard";
import { LinkButton } from "@/components/ui/Button";
import { getData } from "@/lib/data";
import { slugify } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

// Pages are built on first visit and then cached (incremental static regeneration).
export async function generateStaticParams() {
  return [];
}

const load = cache(async (slug: string) => (/^[a-z0-9-]{2,60}$/.test(slug) ? getData().getCountry(slug) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return { title: "Not found", robots: { index: false } };
  return {
    title: c.seoTitle ?? `${c.name} recipes and food culture`,
    description: c.metaDescription ?? c.intro ?? `Recipes, drinks and food culture from ${c.name}.`,
    alternates: { canonical: `/countries/${c.slug}` },
    // Only pages editors have marked as complete are indexed; thin pages are not.
    robots: c.isIndexable ? undefined : { index: false, follow: true },
  };
}

export default async function CountryPage({ params }: Props) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const data = getData();
  const empty = c.dishes.length === 0 && c.drinks.length === 0;

  return (
    <>
      <Container className="pt-8 sm:pt-12">
        <Breadcrumbs items={[{ label: "Explore by Country", href: "/countries" }, { label: c.name }]} />
        <header className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <div className="flex items-center gap-4">
              <CountryFlag iso2={c.iso2} name={c.name} className="h-10 w-15" />
              <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Food from</p>
            </div>
            <h1 className="mt-3 text-5xl font-semibold text-forest-900 sm:text-6xl">{c.name}</h1>
            {c.aliases.length > 0 && <p className="mt-2 text-sm text-ink-muted">Also known as {c.aliases.join(", ")}</p>}
            {c.intro && <p className="mt-4 max-w-2xl text-xl leading-relaxed text-ink-muted">{c.intro}</p>}
            {c.cuisines.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Related cuisines">
                {c.cuisines.map((name) => (
                  <li key={name}>
                    <Link href={`/recipes?cuisine=${slugify(name)}`} className="inline-flex min-h-9 items-center rounded-full bg-forest-100 px-3 text-sm font-medium text-forest-900 hover:underline">
                      {name} cuisine
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <RecipeImage src={c.imageUrl} alt="" seed={c.slug} priority className="aspect-4/3 rounded-[1.5rem]" sizes="(min-width: 1024px) 40vw, 100vw" />
        </header>
        {data.mode === "sample" && (
          <div className="mt-8">
            <SampleNotice />
          </div>
        )}

        {c.foodCulture && (
          <section aria-labelledby="culture" className="mt-14 max-w-3xl">
            <h2 id="culture" className="text-3xl font-semibold text-forest-900">
              Food culture
            </h2>
            <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">{c.foodCulture}</p>
          </section>
        )}

        {c.regions.length > 0 && (
          <section aria-labelledby="regions" className="mt-14">
            <h2 id="regions" className="text-3xl font-semibold text-forest-900">
              Regions and culinary traditions
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.regions.map((g) => (
                <li key={g.slug}>
                  <Link href={`/countries/${c.slug}/${g.slug}`} className="block h-full rounded-card border border-sand-strong bg-white p-5 transition-colors hover:border-forest-900">
                    <h3 className="text-lg font-semibold text-forest-900">{g.name}</h3>
                    {g.description && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{g.description}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>

      {c.dishes.length > 0 && (
        <section aria-labelledby="dishes" className="mt-16 bg-sand/60 py-14">
          <Container>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="dishes" className="text-3xl font-semibold text-forest-900">
                Dishes from {c.name}
              </h2>
              <Link href={`/recipes?country=${c.slug}`} className="min-h-11 content-center text-sm font-semibold text-forest-900 underline-offset-4 hover:underline">
                Search all {c.name} recipes →
              </Link>
            </div>
            <RecipeGrid recipes={c.dishes} />
          </Container>
        </section>
      )}

      {c.drinks.length > 0 && (
        <section aria-labelledby="drinks" className="bg-forest-900 py-14 text-cream">
          <Container>
            <h2 id="drinks" className="mb-8 text-3xl font-semibold">
              Drinks and beverages
            </h2>
            <RecipeGrid recipes={c.drinks} tone="dark" />
          </Container>
        </section>
      )}

      {empty && (
        <Container className="mt-12">
          <div className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8">
            <p className="text-lg font-semibold text-forest-900">We don&apos;t have recipes from {c.name} yet.</p>
            <p className="mt-2 text-ink-muted">Know a dish everyone should try? Members will be able to share their own recipes soon.</p>
            <div className="mt-5">
              <LinkButton href="/countries" variant="secondary">
                Explore other countries
              </LinkButton>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { CountryFlag } from "@/components/cards/CountryCard";
import { LinkButton } from "@/components/ui/Button";
import { getData } from "@/lib/data";

type Props = { params: Promise<{ slug: string; region: string }> };

export const revalidate = 300;

// Pages are built on first visit and then cached (incremental static regeneration).
export async function generateStaticParams() {
  return [];
}

const SLUG = /^[a-z0-9-]{2,60}$/;
const load = cache(async (country: string, region: string) =>
  SLUG.test(country) && SLUG.test(region) ? getData().getRegion(country, region) : null,
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, region } = await params;
  const g = await load(slug, region);
  if (!g) return { title: "Not found", robots: { index: false } };
  return {
    title: `${g.name}, ${g.country.name}`,
    description: g.description ?? undefined,
    alternates: { canonical: `/countries/${slug}/${region}` },
    robots: g.recipes.filter((r) => !r.isSample).length >= 3 ? undefined : { index: false, follow: true },
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug, region } = await params;
  const g = await load(slug, region);
  if (!g) notFound();
  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Explore by Country", href: "/countries" }, { label: g.country.name, href: `/countries/${g.country.slug}` }, { label: g.name }]} />
      <header className="max-w-3xl">
        <div className="flex items-center gap-3">
          <CountryFlag iso2={g.country.iso2} name={g.country.name} className="h-6 w-9" />
          <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">{g.country.name}</p>
        </div>
        <h1 className="mt-3 text-4xl font-semibold text-forest-900 sm:text-5xl">{g.name}</h1>
        {g.description && <p className="mt-4 text-lg text-ink-muted">{g.description}</p>}
      </header>
      <div className="mt-10">
        {g.recipes.length > 0 ? (
          <RecipeGrid recipes={g.recipes} />
        ) : (
          <div className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8">
            <p className="font-semibold text-forest-900">No recipes from this region yet.</p>
            <div className="mt-4">
              <LinkButton href={`/countries/${g.country.slug}`} variant="secondary">
                Back to {g.country.name}
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

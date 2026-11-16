import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { CountryCard, CountryFlag } from "@/components/cards/CountryCard";
import { CountryFilter } from "./CountryFilter";
import { getData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Explore by Country",
  description: "Discover home cooking, drinks and food culture from countries around the world.",
  alternates: { canonical: "/countries" },
};

export const revalidate = 300;

export default async function CountriesPage() {
  const data = getData();
  const all = await data.listCountries();
  const withRecipes = all.filter((c) => c.recipeCount > 0).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.recipeCount - a.recipeCount);
  const others = all.filter((c) => c.recipeCount === 0);

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Explore by Country" }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Explore by country</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">A world of home cooking</h1>
        <p className="mt-3 text-lg text-ink-muted">Travel through kitchens around the world, one country at a time.</p>
      </header>
      {data.mode === "sample" && (
        <div className="mt-6">
          <SampleNotice />
        </div>
      )}

      <section aria-labelledby="with-recipes" className="mt-10">
        <h2 id="with-recipes" className="mb-6 text-2xl font-semibold text-forest-900">
          Countries with recipes
        </h2>
        {withRecipes.length === 0 ? (
          <p className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">Recipes are being added. Check back soon.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {withRecipes.map((c) => (
              <li key={c.slug}>
                <CountryCard country={c} sample={data.mode === "sample"} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="all-countries" className="mt-16">
          <h2 id="all-countries" className="text-2xl font-semibold text-forest-900">
            All countries
          </h2>
          <p className="mt-2 mb-6 text-ink-muted">Recipes from these countries are on the way. Cook something from one of them? Members can share their own recipes.</p>
          <CountryFilter>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              {others.map((c) => (
                <li key={c.slug} data-country-name={c.name.toLowerCase()}>
                  <Link href={`/countries/${c.slug}`} className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-sand">
                    <CountryFlag iso2={c.iso2} name={c.name} className="h-4 w-6" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CountryFilter>
        </section>
      )}
    </Container>
  );
}

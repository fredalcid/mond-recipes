import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { SampleBadge, Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { CountryCard } from "@/components/cards/CountryCard";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { formatMinutes, slugify } from "@/lib/format";
import {
  categories,
  sampleArticles,
  sampleCountries,
  sampleDrinks,
  sampleProducts,
  sampleRecipes,
} from "@/lib/sample-data";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CountriesSection />
      <PopularSection />
      <TrendingSection />
      <DrinksSection />
      <CategoriesSection />
      <CommunitySection />
      <ArticlesSection />
      <ShopSection />
      <NewsletterSection />
    </>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <Container className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-12 lg:pt-16 lg:pb-24">
        <div className="lg:col-span-6">
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-olive-700 uppercase">Discover · Cook · Share</p>
          <h1 id="hero-title" className="text-[2.6rem] leading-[1.05] font-semibold text-forest-900 sm:text-6xl">
            Discover the World, One Recipe at a Time.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
            Explore recipes, discover cultures through food, share your creations, and find inspiration for your next meal.
          </p>

          <form action="/recipes" method="get" role="search" className="mt-8">
            <label htmlFor="hero-search" className="mb-2 block text-sm font-semibold text-ink">
              Search by recipe name or ingredient
            </label>
            <div className="flex flex-col gap-2 rounded-3xl bg-white p-2 shadow-card sm:flex-row sm:rounded-full">
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Try “jollof rice” or “chickpeas”"
                className="min-h-12 flex-1 rounded-full px-5 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none"
              />
              <button type="submit" className="min-h-12 rounded-full bg-forest-900 px-7 font-semibold text-cream hover:bg-forest-800">
                Search
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/recipes" variant="primary">
              Explore Recipes
            </LinkButton>
            <LinkButton href="/countries" variant="secondary">
              Browse by country
            </LinkButton>
          </div>
        </div>

        <div className="lg:col-span-6" aria-hidden="true">
          <div className="grid grid-cols-6 grid-rows-6 gap-3 sm:gap-4">
            <PhotoPlaceholder tone="gold" label="Hero photo" className="col-span-4 row-span-6 aspect-4/5 rounded-[1.75rem]" />
            <PhotoPlaceholder tone="olive" label="Photo" className="col-span-2 row-span-3 rounded-[1.25rem]" />
            <PhotoPlaceholder tone="sand" label="Photo" className="col-span-2 row-span-3 rounded-[1.25rem]" />
          </div>
        </div>
      </Container>
    </section>
  );
}

function CountriesSection() {
  return (
    <section aria-labelledby="countries-title" className="py-16">
      <Container>
        <SectionHeading
          id="countries-title"
          eyebrow="Discover by country"
          title="A world of home cooking"
          intro="Travel through kitchens around the world. Country pages are generated from the database, so new countries can be added at any time."
          action={{ label: "All countries", href: "/countries" }}
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sampleCountries.map((c) => (
            <li key={c.slug}>
              <CountryCard country={{ ...c, sample: true }} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function PopularSection() {
  return (
    <section aria-labelledby="popular-title" className="bg-sand/60 py-16">
      <Container>
        <SectionHeading
          id="popular-title"
          eyebrow="Popular recipes"
          title="Loved by home cooks"
          intro="Ratings and review counts come only from real members. Until then, recipes show “Not yet rated”."
          action={{ label: "All recipes", href: "/recipes" }}
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sampleRecipes.map((r) => (
            <li key={r.title}>
              <RecipeCard recipe={{ ...r, sample: true }} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function TrendingSection() {
  return (
    <section aria-labelledby="trending-title" className="py-16">
      <Container>
        <SectionHeading id="trending-title" eyebrow="Trending now" title="What people are cooking" />
        <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-sand-strong bg-white/60 p-8 sm:flex-row sm:items-center">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-900">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-forest-900">Trending recipes appear here once members start cooking, saving and rating.</p>
            <p className="mt-1 text-sm text-ink-muted">This list is calculated from real activity only. It is never filled in by hand.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DrinksSection() {
  return (
    <section aria-labelledby="drinks-title" className="bg-forest-900 py-16 text-cream">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-gold-500 uppercase">Drinks &amp; Tea</p>
            <h2 id="drinks-title" className="text-3xl font-semibold sm:text-4xl">
              Tea, coffee and drinks from every corner of the world
            </h2>
            <p className="mt-3 text-cream/80">Traditional teas, coffees, juices, smoothies, mocktails and more.</p>
          </div>
          <Link href="/drinks-tea" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold-500 underline-offset-4 hover:underline">
            All drinks <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sampleDrinks.map((d) => (
            <li key={d.title}>
              <article className="flex h-full flex-col overflow-hidden rounded-card bg-forest-800">
                <div className="relative">
                  <PhotoPlaceholder tone={d.tone} className="aspect-square" />
                  <span className="absolute top-3 left-3">
                    <SampleBadge />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-xs font-semibold tracking-[0.14em] text-gold-500 uppercase">{d.category}</p>
                  <h3 className="text-xl font-semibold">{d.title}</h3>
                  <p className="mt-auto text-sm text-cream/75">
                    {d.origin} · {formatMinutes(d.minutes)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section aria-labelledby="categories-title" className="py-16">
      <Container>
        <SectionHeading id="categories-title" eyebrow="Explore by category" title="What are you in the mood for?" />
        <ul className="flex flex-wrap gap-3">
          {categories.map((c) => (
            <li key={c}>
              <Link
                href={`/recipes?category=${slugify(c)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-sand-strong bg-white px-5 text-[15px] font-medium text-forest-900 transition-colors hover:border-forest-900 hover:bg-forest-900 hover:text-cream"
              >
                {c}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function CommunitySection() {
  return (
    <section aria-labelledby="community-title" className="py-16">
      <Container>
        <div className="grid items-center gap-10 overflow-hidden rounded-[2rem] bg-sand p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-olive-700 uppercase">The Mònd community</p>
            <h2 id="community-title" className="text-3xl font-semibold text-forest-900 sm:text-4xl">
              Cook it, photograph it, share it.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-ink-muted">
              Share your own recipes, post photos of what you made, and swap tips with food lovers from around the world.
              Member contributions are reviewed before they appear.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/join">Join the community</LinkButton>
              <LinkButton href="/community" variant="secondary">
                See the community
              </LinkButton>
            </div>
          </div>
          <div className="rounded-card border border-dashed border-sand-strong bg-white/70 p-6">
            <p className="font-semibold text-forest-900">Member photos and featured cooks will appear here.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Only approved contributions from real members are shown. The community opens in Phase 4.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3" aria-hidden="true">
              <PhotoPlaceholder tone="cream" label="" className="aspect-square rounded-xl" />
              <PhotoPlaceholder tone="olive" label="" className="aspect-square rounded-xl" />
              <PhotoPlaceholder tone="gold" label="" className="aspect-square rounded-xl" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ArticlesSection() {
  return (
    <section aria-labelledby="articles-title" className="py-16">
      <Container>
        <SectionHeading
          id="articles-title"
          eyebrow="Articles & videos"
          title="Learn, cook, explore"
          action={{ label: "All articles & videos", href: "/articles" }}
        />
        <ul className="grid gap-6 md:grid-cols-3">
          {sampleArticles.map((a) => (
            <li key={a.title}>
              <article className="flex h-full flex-col gap-4">
                <div className="relative">
                  <PhotoPlaceholder tone={a.tone} className="aspect-16/10 rounded-card" />
                  <span className="absolute top-3 left-3">
                    <SampleBadge />
                  </span>
                </div>
                <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{a.kind}</p>
                <h3 className="text-xl leading-snug font-semibold text-forest-900">{a.title}</h3>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ShopSection() {
  return (
    <section aria-labelledby="shop-title" className="bg-sand/60 py-16">
      <Container>
        <SectionHeading
          id="shop-title"
          eyebrow="Shop"
          title="Kitchen essentials we recommend"
          intro="Every product links to an outside retailer. Mònd Recipes may earn a commission on purchases made through these links."
          action={{ label: "Visit the shop", href: "/shop" }}
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sampleProducts.map((p) => (
            <li key={p.name}>
              <article className="flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card">
                <div className="relative">
                  <PhotoPlaceholder tone={p.tone} label="Product photo" className="aspect-square" />
                  <span className="absolute top-3 left-3">
                    <SampleBadge />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{p.category}</p>
                  <h3 className="text-lg font-semibold text-forest-900">{p.name}</h3>
                  <p className="mt-auto pt-2 text-sm text-ink-muted">Retailer links are added in Phase 3.</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section aria-labelledby="newsletter-title" className="pt-16">
      <Container>
        <div className="grid items-center gap-8 rounded-[2rem] border border-sand-strong bg-white p-8 shadow-card sm:p-12 lg:grid-cols-2">
          <div>
            <Badge tone="editorial">Free newsletter</Badge>
            <h2 id="newsletter-title" className="mt-4 text-3xl font-semibold text-forest-900 sm:text-4xl">
              A taste of the world in your inbox
            </h2>
            <p className="mt-3 text-ink-muted">New recipes, country guides and cooking tips. No spam, and you can unsubscribe at any time.</p>
          </div>
          <NewsletterForm source="homepage" />
        </div>
      </Container>
    </section>
  );
}

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { CountryCard } from "@/components/cards/CountryCard";
import { getData, type CountrySummary, type RecipeSummary } from "@/lib/data";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { SearchBox } from "@/components/search/SearchBox";
import { slugify } from "@/lib/format";
import { categories } from "@/lib/sample-data";
import { getContent, type ArticleSummary, type Product, type VideoSummary } from "@/lib/content";
import { ArticleCard } from "@/components/content/ArticleCard";
import { VideoCard } from "@/components/content/VideoCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { AdSlot } from "@/components/ads/AdSlot";

export const revalidate = 300;

async function loadHome() {
  const data = getData();
  try {
    const [countries, popular, newest, drinks] = await Promise.all([
      data.listCountries(),
      data.searchRecipes({ kind: "food", sort: "popular" }),
      data.searchRecipes({ kind: "food", sort: "newest" }),
      data.searchRecipes({ kind: "drink", sort: "popular" }),
    ]);
    const featured = countries.filter((c) => c.isFeatured || c.recipeCount > 0)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.recipeCount - a.recipeCount)
      .slice(0, 6);
    // Trending uses real activity only: recipes members have actually saved or rated.
    const trending = popular.items.filter((r) => r.saveCount > 0 || r.ratingCount > 0).slice(0, 4);
    const hasActivity = popular.items.some((r) => r.saveCount > 0 || r.ratingCount > 0);
    const content = getContent();
    const [articles, videos, products] = await Promise.all([
      content.listArticles({ pageSize: 3 }).then((r) => r.items).catch(() => []),
      content.listVideos(3).catch(() => []),
      content.listProducts().catch(() => []),
    ]);
    return {
      articles,
      videos,
      products: [...products.filter((p) => p.isFeatured), ...products.filter((p) => !p.isFeatured)].slice(0, 4),
      sample: data.mode === "sample",
      countries: featured,
      popular: (hasActivity ? popular.items : newest.items).slice(0, 4),
      popularIsNewest: !hasActivity,
      trending,
      drinks: drinks.items.slice(0, 4),
    };
  } catch (e) {
    console.error(e);
    return { articles: [], videos: [], products: [], sample: false, countries: [], popular: [], popularIsNewest: true, trending: [], drinks: [] };
  }
}

export default async function HomePage() {
  const home = await loadHome();
  return (
    <>
      <Hero />
      <CountriesSection countries={home.countries} sample={home.sample} />
      <PopularSection recipes={home.popular} newest={home.popularIsNewest} />
      <TrendingSection recipes={home.trending} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdSlot id="home_mid" />
      </div>
      <DrinksSection recipes={home.drinks} />
      <CategoriesSection />
      <CommunitySection />
      <ArticlesSection articles={home.articles} videos={home.videos} />
      <ShopSection products={home.products} />
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

          <div className="mt-8">
            <p className="mb-2 text-sm font-semibold text-ink">Search by recipe name or ingredient</p>
            <SearchBox label="Search by recipe name or ingredient" placeholder="Try “jollof rice” or “mint”" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/recipes" variant="primary">
              Explore Recipes
            </LinkButton>
            <LinkButton href="/countries" variant="secondary">
              Browse by country
            </LinkButton>
            <LinkButton href="/ingredients" variant="ghost">
              Cook with what you have
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

function CountriesSection({ countries, sample }: { countries: CountrySummary[]; sample: boolean }) {
  if (countries.length === 0) return null;
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
          {countries.map((c) => (
            <li key={c.slug}>
              <CountryCard country={c} sample={sample} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function PopularSection({ recipes, newest }: { recipes: RecipeSummary[]; newest: boolean }) {
  if (recipes.length === 0) return null;
  return (
    <section aria-labelledby="popular-title" className="bg-sand/60 py-16">
      <Container>
        <SectionHeading
          id="popular-title"
          eyebrow={newest ? "New recipes" : "Popular recipes"}
          title={newest ? "Fresh from the kitchen" : "Loved by home cooks"}
          intro="Ratings and review counts come only from real members. Until then, recipes show “Not yet rated”."
          action={{ label: "All recipes", href: "/recipes" }}
        />
        <RecipeGrid recipes={recipes} />
      </Container>
    </section>
  );
}

function TrendingSection({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <section aria-labelledby="trending-title" className="py-16">
      <Container>
        <SectionHeading id="trending-title" eyebrow="Trending now" title="What people are cooking" />
        {recipes.length > 0 ? (
          <RecipeGrid recipes={recipes} />
        ) : (
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
        )}
      </Container>
    </section>
  );
}

function DrinksSection({ recipes }: { recipes: RecipeSummary[] }) {
  if (recipes.length === 0) return null;
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
        <RecipeGrid recipes={recipes} tone="dark" />
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

function ArticlesSection({ articles, videos }: { articles: ArticleSummary[]; videos: VideoSummary[] }) {
  if (articles.length === 0 && videos.length === 0) return null;
  return (
    <section aria-labelledby="articles-title" className="py-16">
      <Container>
        <SectionHeading id="articles-title" eyebrow="Articles & videos" title="Learn, cook, explore" action={{ label: "All articles & videos", href: "/articles" }} />
        {articles.length > 0 && (
          <ul className="grid gap-10 md:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        )}
        {videos.length > 0 && (
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <VideoCard video={v} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

function ShopSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="shop-title" className="bg-sand/60 py-16">
      <Container>
        <SectionHeading
          id="shop-title"
          eyebrow="Shop"
          title="Kitchen essentials we recommend"
          intro="Every product opens on the retailer's website. Mònd Recipes may earn a commission when you buy through these links."
          action={{ label: "Visit the shop", href: "/shop" }}
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} from="/" />
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

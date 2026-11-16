import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { ProductCard } from "./ProductCard";
import { getContent } from "@/lib/content";

export async function ShopView({ category }: { category?: { slug: string; name: string } }) {
  const content = getContent();
  const [products, categories] = await Promise.all([content.listProducts(category?.slug), content.listProductCategories()]);
  const path = category ? `/shop/${category.slug}` : "/shop";
  const featured = category ? [] : products.filter((p) => p.isFeatured);
  const rest = category ? products : products.filter((p) => !p.isFeatured);

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={category ? [{ label: "Shop", href: "/shop" }, { label: category.name }] : [{ label: "Shop" }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">{category ? category.name : "Kitchen essentials we recommend"}</h1>
        <p className="mt-3 text-lg text-ink-muted">Tools and books we think are worth having. Every product opens on the retailer&apos;s own website, where you can buy it.</p>
      </header>
      <p role="note" className="mt-6 rounded-xl bg-sand px-4 py-3 text-sm">
        <strong>How the shop works:</strong> Mònd Recipes may earn a commission when you buy through these links, at no extra cost to you.
        Products marked “Sponsored” are paid placements.{" "}
        <Link href="/affiliate-disclosure" className="font-semibold text-forest-900 underline">
          Affiliate disclosure
        </Link>
      </p>
      {content.mode === "sample" && (
        <div className="mt-4">
          <SampleNotice kind="products" />
        </div>
      )}

      <nav aria-label="Product categories" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href="/shop" aria-current={!category ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${!category ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white text-forest-900"}`}>
              Everything
            </Link>
          </li>
          {categories
            .filter((c) => c.count > 0 || c.slug === category?.slug)
            .map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/shop/${c.slug}`}
                  aria-current={category?.slug === c.slug ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${category?.slug === c.slug ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white text-forest-900 hover:border-forest-900"}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      {products.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">No products here yet.</p>
      ) : (
        <>
          {featured.length > 0 && (
            <section aria-labelledby="featured-products" className="mt-10">
              <h2 id="featured-products" className="mb-6 text-2xl font-semibold text-forest-900">
                Our picks
              </h2>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} from={path} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-label="Products" className="mt-12">
              {featured.length > 0 && <h2 className="mb-6 text-2xl font-semibold text-forest-900">More essentials</h2>}
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {rest.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} from={path} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Container>
  );
}

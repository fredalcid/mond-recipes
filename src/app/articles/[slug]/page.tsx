import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/ui/JsonLd";
import { Markdown, splitMarkdown } from "@/components/content/Markdown";
import { ArticleCard } from "@/components/content/ArticleCard";
import { ShareButtons } from "@/components/content/ShareButtons";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { getContent } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

const load = cache(async (slug: string) => (/^[a-z0-9-]{2,90}$/.test(slug) ? getContent().getArticle(slug) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return { title: "Not found", robots: { index: false } };
  return {
    title: a.seoTitle ?? a.title,
    description: a.metaDescription ?? a.excerpt ?? undefined,
    alternates: { canonical: `/articles/${a.slug}` },
    robots: a.isSample ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", title: a.title, description: a.excerpt ?? undefined, publishedTime: a.publishedAt ?? undefined, images: a.imageUrl ? [a.imageUrl] : undefined },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const [first, second] = splitMarkdown(a.body);
  const related = a.categories[0]
    ? (await getContent().listArticles({ category: a.categories[0].slug, pageSize: 4 })).items.filter((x) => x.slug !== a.slug).slice(0, 3)
    : [];

  return (
    <article>
      <Container className="pt-8 sm:pt-12">
        <Breadcrumbs items={[{ label: "Articles & Videos", href: "/articles" }, { label: a.title }]} />
        <header className="mx-auto max-w-3xl text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {a.isSample && <SampleBadge />}
            {a.categories.map((c) => (
              <Link key={c.slug} href={`/articles?category=${c.slug}`} className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase hover:underline">
                {c.name}
              </Link>
            ))}
          </div>
          <h1 className="mt-4 text-4xl leading-tight font-semibold text-forest-900 sm:text-5xl">{a.title}</h1>
          {a.excerpt && <p className="mt-4 text-xl leading-relaxed text-ink-muted">{a.excerpt}</p>}
          <p className="mt-5 text-sm text-ink-muted">
            By {a.byline} · <time dateTime={a.publishedAt ?? undefined}>{formatDate(a.publishedAt)}</time> · {a.readingMinutes} min read
          </p>
        </header>
        <RecipeImage src={a.imageUrl} alt={a.imageAlt ?? ""} seed={a.slug} priority sizes="(min-width: 1024px) 1024px, 100vw" className="mx-auto mt-10 aspect-16/8 max-w-5xl rounded-[1.5rem]" />

        <div className="mx-auto mt-12 max-w-3xl">
          <Markdown>{first}</Markdown>
          {second && (
            <>
              <AdSlot id="article_mid" />
              <Markdown>{second}</Markdown>
            </>
          )}
          <div className="mt-12 border-t border-sand-strong pt-6">
            <ShareButtons title={a.title} />
          </div>
        </div>
      </Container>

      {a.recipes.length > 0 && (
        <section aria-labelledby="article-recipes" className="mt-16 bg-sand/60 py-14">
          <Container>
            <h2 id="article-recipes" className="mb-8 text-3xl font-semibold text-forest-900">
              Recipes from this article
            </h2>
            <RecipeGrid recipes={a.recipes} />
          </Container>
        </section>
      )}

      {related.length > 0 && (
        <Container className="mt-16">
          <h2 className="mb-8 text-3xl font-semibold text-forest-900">Keep reading</h2>
          <ul className="grid gap-10 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <ArticleCard article={r} />
              </li>
            ))}
          </ul>
        </Container>
      )}

      {!a.isSample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description: a.excerpt ?? undefined,
            image: a.imageUrl ? [a.imageUrl] : undefined,
            datePublished: a.publishedAt ?? undefined,
            dateModified: a.updatedAt ?? a.publishedAt ?? undefined,
            author: { "@type": a.byline === site.name ? "Organization" : "Person", name: a.byline },
            publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: new URL("/brand/mond-badge.png", site.url).toString() } },
            mainEntityOfPage: new URL(`/articles/${a.slug}`, site.url).toString(),
          }}
        />
      )}
    </article>
  );
}

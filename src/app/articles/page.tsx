import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { ArticleCard } from "@/components/content/ArticleCard";
import { VideoCard } from "@/components/content/VideoCard";
import { getContent } from "@/lib/content";

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: "Articles & Videos",
    description: "Food culture, country guides, cooking techniques, ingredient guides and video tutorials.",
    alternates: { canonical: "/articles" },
    robots: sp.category || sp.page ? { index: false, follow: true } : undefined,
  };
}

const PAGE = 9;

export default async function ArticlesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const content = getContent();
  const categories = await content.listArticleCategories();
  const category = categories.some((c) => c.slug === sp.category) ? sp.category : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ items, total }, videos] = await Promise.all([content.listArticles({ category, page, pageSize: PAGE }), content.listVideos(6)]);
  const [lead, ...rest] = page === 1 && !category ? items : [undefined, ...items];

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Articles & Videos" }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Articles &amp; videos</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">Learn, cook, explore</h1>
        <p className="mt-3 text-lg text-ink-muted">Stories about food culture, guides to ingredients and techniques, and videos to cook along with.</p>
      </header>
      {content.mode === "sample" && (
        <div className="mt-6">
          <SampleNotice kind="articles" />
        </div>
      )}

      <nav aria-label="Article topics" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href="/articles" aria-current={!category ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${!category ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white text-forest-900"}`}>
              All topics
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/articles?category=${c.slug}`}
                aria-current={category === c.slug ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${category === c.slug ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white text-forest-900 hover:border-forest-900"}`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">No articles in this topic yet.</p>
      ) : (
        <>
          {lead && (
            <div className="mt-10">
              <ArticleCard article={lead} large />
            </div>
          )}
          <ul className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {rest.filter(Boolean).map((a) => (
              <li key={a!.id}>
                <ArticleCard article={a!} />
              </li>
            ))}
          </ul>
          <Pagination path="/articles" query={{ category }} page={page} total={total} pageSize={PAGE} />
        </>
      )}

      <section aria-labelledby="videos-heading" className="mt-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="videos-heading" className="text-3xl font-semibold text-forest-900">
            Videos
          </h2>
          {videos.length > 0 && (
            <Link href="/videos" className="min-h-11 content-center text-sm font-semibold text-forest-900 underline-offset-4 hover:underline">
              All videos →
            </Link>
          )}
        </div>
        {videos.length === 0 ? (
          <p className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">Cooking videos are on the way.</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <li key={v.id}>
                <VideoCard video={v} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

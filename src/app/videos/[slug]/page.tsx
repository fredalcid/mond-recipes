import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { YouTubeEmbed } from "@/components/content/YouTubeEmbed";
import { ShareButtons } from "@/components/content/ShareButtons";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { getContent } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

const load = cache(async (slug: string) => (/^[a-z0-9-]{2,90}$/.test(slug) ? getContent().getVideo(slug) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await load((await params).slug);
  if (!v) return { title: "Not found", robots: { index: false } };
  return {
    title: v.seoTitle ?? v.title,
    description: v.metaDescription ?? v.description?.slice(0, 160) ?? undefined,
    alternates: { canonical: `/videos/${v.slug}` },
    openGraph: { type: "video.other", title: v.title, images: [v.thumbnailUrl] },
  };
}

export default async function VideoPage({ params }: Props) {
  const v = await load((await params).slug);
  if (!v) notFound();
  return (
    <>
      <Container className="py-10 sm:py-14">
        <Breadcrumbs items={[{ label: "Articles & Videos", href: "/articles" }, { label: "Videos", href: "/videos" }, { label: v.title }]} />
        <div className="mx-auto max-w-4xl">
          {v.collection && <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">{v.collection}</p>}
          <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">{v.title}</h1>
          {v.publishedAt && <p className="mt-3 text-sm text-ink-muted">{formatDate(v.publishedAt)}</p>}
          <div className="mt-8">
            <YouTubeEmbed id={v.youtubeId} title={v.title} thumbnail={v.thumbnailUrl} />
          </div>
          {v.description && <p className="mt-8 text-lg leading-relaxed whitespace-pre-line">{v.description}</p>}
          <div className="mt-8">
            <ShareButtons title={v.title} />
          </div>
        </div>
      </Container>
      {v.recipes.length > 0 && (
        <section aria-labelledby="video-recipes" className="bg-sand/60 py-14">
          <Container>
            <h2 id="video-recipes" className="mb-8 text-3xl font-semibold text-forest-900">
              Recipes in this video
            </h2>
            <RecipeGrid recipes={v.recipes} />
          </Container>
        </section>
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: v.title,
          description: v.description ?? v.title,
          thumbnailUrl: [v.thumbnailUrl],
          uploadDate: v.publishedAt ?? undefined,
          duration: v.durationSeconds ? `PT${Math.floor(v.durationSeconds / 60)}M${v.durationSeconds % 60}S` : undefined,
          embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
          publisher: { "@type": "Organization", name: site.name },
        }}
      />
    </>
  );
}

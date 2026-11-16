import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { VideoCard } from "@/components/content/VideoCard";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Cooking videos",
  description: "Cooking tutorials, recipe demonstrations and food culture videos.",
  alternates: { canonical: "/videos" },
};
export const revalidate = 300;

export default async function VideosPage() {
  const videos = await getContent().listVideos(60);
  const collections = [...new Set(videos.map((v) => v.collection).filter(Boolean))] as string[];
  const groups: [string, typeof videos][] = collections.length
    ? [...collections.map((c) => [c, videos.filter((v) => v.collection === c)] as [string, typeof videos]), ["More videos", videos.filter((v) => !v.collection)]]
    : [["All videos", videos]];

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Articles & Videos", href: "/articles" }, { label: "Videos" }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Videos</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">Cook along with us</h1>
        <p className="mt-3 text-lg text-ink-muted">Tutorials, recipe demonstrations and stories from kitchens around the world.</p>
      </header>
      {videos.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">Cooking videos are on the way.</p>
      ) : (
        groups
          .filter(([, list]) => list.length > 0)
          .map(([name, list]) => (
            <section key={name} className="mt-12" aria-label={name}>
              <h2 className="mb-6 text-2xl font-semibold text-forest-900">{name}</h2>
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((v) => (
                  <li key={v.id}>
                    <VideoCard video={v} />
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </Container>
  );
}

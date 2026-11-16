import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PostGrid } from "@/components/community/PostCard";
import { getChallenge, listPosts } from "@/lib/community/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getChallenge((await params).slug);
  if (!c || c.status !== "published") return { title: "Challenge not found", robots: { index: false } };
  return { title: c.title, description: c.description?.slice(0, 160), alternates: { canonical: `/community/challenges/${c.slug}` } };
}

export default async function ChallengePage({ params, searchParams }: Props) {
  const c = await getChallenge((await params).slug);
  if (!c) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const posts = await listPosts({ challengeId: c.id, page });
  const today = new Date().toISOString().slice(0, 10);
  const open = c.startsOn <= today && c.endsOn >= today;
  const status = open ? `Open until ${formatDate(c.endsOn)}` : c.startsOn > today ? `Starts ${formatDate(c.startsOn)}` : `Ended ${formatDate(c.endsOn)}`;

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Community", href: "/community" }, { label: "Challenges", href: "/community/challenges" }, { label: c.title }]} />
      {c.status !== "published" && <p className="mb-4 rounded-xl bg-sand px-4 py-2 text-sm">Draft: only staff can see this challenge.</p>}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-olive-700 uppercase">Challenge · {status}</p>
          <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">{c.title}</h1>
          {c.description && <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">{c.description}</p>}
          {c.sponsorName && <p className="mt-3 text-sm text-ink-muted">Sponsored by {c.sponsorName}</p>}
        </div>
        {open && (
          <Link href={`/community/new?challenge=${c.slug}`} className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-forest-900 px-6 font-semibold text-cream hover:bg-forest-800">
            Enter this challenge
          </Link>
        )}
      </header>
      <h2 className="mt-12 mb-6 text-2xl font-semibold text-forest-900">Entries</h2>
      <PostGrid posts={posts.items} empty={<p className="text-ink-muted">No entries yet.{open ? " Be the first!" : ""}</p>} />
      {(page > 1 || posts.hasMore) && (
        <div className="mt-8 flex justify-between">
          {page > 1 ? <Link href={`?page=${page - 1}`} className="font-semibold text-forest-900 underline">← Newer</Link> : <span />}
          {posts.hasMore && <Link href={`?page=${page + 1}`} className="font-semibold text-forest-900 underline">More →</Link>}
        </div>
      )}
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { listChallenges } from "@/lib/community/server";
import { formatDate } from "@/lib/format";
import type { Challenge } from "@/lib/community/types";

export const metadata: Metadata = {
  title: "Community challenges",
  description: "Cook along with the Mònd Recipes community: themed challenges with a new dish, country or ingredient.",
  alternates: { canonical: "/community/challenges" },
};
export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const { current, upcoming, past } = await listChallenges();
  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Community", href: "/community" }, { label: "Challenges" }]} />
      <h1 className="text-4xl font-semibold text-forest-900 sm:text-5xl">Community challenges</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">Cook along with members around the world. Pick a challenge, cook, and post your photo, video or tip.</p>
      {current.length + upcoming.length + past.length === 0 && <p className="mt-10 text-ink-muted">No challenges have been announced yet. Check back soon.</p>}
      <List title="Happening now" items={current} label={(c) => `Until ${formatDate(c.endsOn)}`} />
      <List title="Coming up" items={upcoming} label={(c) => `Starts ${formatDate(c.startsOn)}`} />
      <List title="Past challenges" items={past} label={(c) => `Ended ${formatDate(c.endsOn)}`} />
    </Container>
  );
}

function List({ title, items, label }: { title: string; items: Challenge[]; label: (c: Challenge) => string }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-forest-900">{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={`/community/challenges/${c.slug}`} className="flex h-full flex-col rounded-card border border-sand-strong bg-white p-5 hover:border-forest-900">
              <span className="text-xl font-semibold text-forest-900">{c.title}</span>
              {c.description && <span className="mt-2 line-clamp-3 text-ink-muted">{c.description}</span>}
              <span className="mt-auto pt-4 text-sm font-semibold">{label(c)}</span>
              {c.sponsorName && <span className="text-xs text-ink-muted">Sponsored by {c.sponsorName}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

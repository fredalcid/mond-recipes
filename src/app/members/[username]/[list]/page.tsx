import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { FollowButton } from "@/components/community/FollowButton";
import { getMemberByUsername, listFollows } from "@/lib/community/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: true } };

type Props = { params: Promise<{ username: string; list: string }>; searchParams: Promise<{ page?: string }> };

export default async function FollowListPage({ params, searchParams }: Props) {
  const { username, list } = await params;
  if (list !== "followers" && list !== "following") notFound();
  const member = await getMemberByUsername(username);
  if (!member || member.isSuspended) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, hasMore } = await listFollows(member.id, list, page);
  const title = list === "followers" ? `People following ${member.displayName}` : `People ${member.displayName} follows`;

  return (
    <Container className="max-w-3xl py-10">
      <Breadcrumbs items={[{ label: "Community", href: "/community" }, { label: member.displayName, href: `/members/${member.username}` }, { label: list === "followers" ? "Followers" : "Following" }]} />
      <h1 className="text-4xl font-semibold text-forest-900">{title}</h1>
      {items.length === 0 ? (
        <p className="mt-8 text-ink-muted">{list === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
      ) : (
        <ul className="mt-8 divide-y divide-sand rounded-card border border-sand-strong bg-white">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-4 p-4">
              <MemberAvatar member={m} />
              <div className="min-w-0 flex-1">
                <Link href={`/members/${m.username}`} className="block truncate font-semibold text-forest-900 hover:underline">
                  {m.displayName}
                </Link>
                <span className="text-sm text-ink-muted">@{m.username}</span>
              </div>
              <FollowButton memberId={m.id} name={m.displayName} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex justify-between">
        {page > 1 ? <Link href={`?page=${page - 1}`} className="font-semibold text-forest-900 underline">← Previous</Link> : <span />}
        {hasMore && <Link href={`?page=${page + 1}`} className="font-semibold text-forest-900 underline">Next →</Link>}
      </div>
    </Container>
  );
}

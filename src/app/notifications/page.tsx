import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { getCurrentMember } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { listNotifications, notificationLinks } from "@/lib/community/server";
import { timeAgo, type NotificationItem } from "@/lib/community/types";
import { markAllRead } from "@/app/account/actions";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_TEXT: Record<string, string> = {
  approved: "was approved and is now in the community",
  published: "was published",
  rejected: "needs changes before it can be published",
  removed: "was removed by a moderator",
  unpublished: "was unpublished by our editors",
  suspended: "Your account was suspended",
  restored: "Your account was restored",
};

function describe(n: NotificationItem): string {
  const who = n.actor?.displayName ?? "Someone";
  const thing = n.targetType === "post" ? "post" : n.targetType === "comment" ? "comment" : n.targetType === "recipe" ? "recipe" : "content";
  switch (n.type) {
    case "follow":
      return `${who} started following you`;
    case "like":
      return `${who} liked your ${thing}`;
    case "comment":
      return `${who} commented on your ${n.data.post_id ? "post" : "recipe"}`;
    case "reply":
      return `${who} replied to your comment`;
    case "review":
      return `${who} rated your recipe ${n.data.rating ?? ""}★`.trim();
    case "activity":
      return n.targetType === "recipe" ? `${who} published a new recipe${n.data.title ? `: ${n.data.title}` : ""}` : `${who} shared a new post`;
    case "moderation": {
      const status = String(n.data.status ?? "");
      if (n.targetType === "account") return STATUS_TEXT[status] ?? "Your account was updated";
      const title = n.data.title ? `“${n.data.title}”` : `Your ${thing}`;
      return `${n.data.title ? `Your recipe ${title}` : title} ${STATUS_TEXT[status] ?? "was reviewed"}`;
    }
  }
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/sign-in");
  const member = await getCurrentMember();
  if (!member) redirect("/sign-in?next=/notifications");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, hasMore } = await listNotifications(page);
  const links = await notificationLinks(items);
  const unread = items.some((n) => !n.readAt);

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-semibold text-forest-900">Notifications</h1>
        <div className="flex items-center gap-2">
          {unread && (
            <form action={markAllRead}>
              <button type="submit" className="min-h-11 rounded-full border border-sand-strong bg-white px-4 text-sm font-semibold hover:bg-sand">
                Mark all as read
              </button>
            </form>
          )}
          <Link href="/account/notifications" className="min-h-11 content-center rounded-full px-4 text-sm font-semibold text-forest-900 hover:bg-sand">
            Settings
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="mt-10 text-ink-muted">No notifications yet. When people follow you, like or comment on what you share, you&apos;ll see it here.</p>
      ) : (
        <ul className="mt-8 divide-y divide-sand rounded-card border border-sand-strong bg-white">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={links.get(n.id) ?? "/notifications"} className={`flex items-start gap-4 p-4 hover:bg-ivory ${n.readAt ? "" : "bg-gold-500/10"}`}>
                {n.actor ? (
                  <MemberAvatar member={n.actor} />
                ) : (
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand text-lg">
                    ✓
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block">
                    {!n.readAt && <span className="sr-only">New: </span>}
                    {describe(n)}
                  </span>
                  {typeof n.data.note === "string" && n.data.note && <span className="mt-1 block text-sm text-ink-muted">Note from the team: {n.data.note}</span>}
                  <time dateTime={n.createdAt} className="text-sm text-ink-muted">
                    {timeAgo(n.createdAt)}
                  </time>
                </span>
                {!n.readAt && <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-600" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex justify-between">
        {page > 1 ? <Link href={`?page=${page - 1}`} className="font-semibold text-forest-900 underline">← Newer</Link> : <span />}
        {hasMore && <Link href={`?page=${page + 1}`} className="font-semibold text-forest-900 underline">Older →</Link>}
      </div>
    </Container>
  );
}

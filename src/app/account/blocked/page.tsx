import type { Metadata } from "next";
import Link from "next/link";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { getCurrentMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { memberFromRow } from "@/lib/community/types";
import { BLOCKED_SELECT } from "@/lib/community/queries";
import { unblockMember } from "../actions";

export const metadata: Metadata = { title: "Blocked members", robots: { index: false } };

export default async function BlockedPage() {
  const member = (await getCurrentMember())!;
  const db = (await createClient())!;
  const { data } = await db.from("blocks").select(BLOCKED_SELECT).eq("blocker_id", member.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST row
  const blocked = ((data ?? []) as any[]).map((r) => memberFromRow(r.member));
  return (
    <div>
      <h1 className="text-4xl font-semibold text-forest-900">Blocked members</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        You don&apos;t see posts, comments or reviews from members you block, and they can&apos;t follow you, comment on your content or like it. They
        aren&apos;t told that you blocked them. To block someone, use the Block button on their profile.
      </p>
      {blocked.length === 0 ? (
        <p className="mt-8 text-ink-muted">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="mt-8 divide-y divide-sand rounded-card border border-sand-strong bg-white">
          {blocked.map((m) => (
            <li key={m.id} className="flex items-center gap-4 p-4">
              <MemberAvatar member={m} />
              <Link href={`/members/${m.username}`} className="min-w-0 flex-1 truncate font-semibold text-forest-900 hover:underline">
                {m.displayName}
              </Link>
              <form action={unblockMember}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="min-h-11 rounded-full border border-sand-strong px-4 text-sm font-semibold hover:bg-sand">
                  Unblock
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

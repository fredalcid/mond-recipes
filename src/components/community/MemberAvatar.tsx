import Link from "next/link";
import type { MemberSummary } from "@/lib/community/types";

const SIZES = { sm: "h-8 w-8 text-sm", md: "h-11 w-11 text-base", lg: "h-24 w-24 text-3xl sm:h-28 sm:w-28" } as const;

export function MemberAvatar({ member, size = "md" }: { member: Pick<MemberSummary, "displayName" | "avatarUrl">; size?: keyof typeof SIZES }) {
  return member.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- member uploads are small, already-sized avatars
    <img src={member.avatarUrl} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-white`} />
  ) : (
    <span aria-hidden="true" className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-forest-900 font-semibold text-cream ring-2 ring-white`}>
      {member.displayName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function MemberLine({ member, meta }: { member: MemberSummary; meta?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MemberAvatar member={member} size="sm" />
      <div className="min-w-0 text-sm leading-tight">
        <Link href={`/members/${member.username}`} className="block truncate font-semibold text-forest-900 hover:underline">
          {member.displayName}
        </Link>
        {meta && <span className="text-ink-muted">{meta}</span>}
      </div>
    </div>
  );
}

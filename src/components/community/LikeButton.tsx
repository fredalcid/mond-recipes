"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/community/types";
import { participationBlock, useViewer } from "./useViewer";

type Target = "post" | "comment" | "recipe";

/** Like / unlike. Counts are kept by the database; this shows the change straight away. */
export function LikeButton({ target, id, count, compact = false, disabled = false }: { target: Target; id: string; count: number; compact?: boolean; disabled?: boolean }) {
  const { viewer, ready } = useViewer();
  const pathname = usePathname();
  const [liked, setLiked] = useState(false);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    supabase
      .from("likes")
      .select("target_id")
      .eq("user_id", viewer.id)
      .eq("target_type", target)
      .eq("target_id", id)
      .maybeSingle()
      .then(({ data }) => setLiked(Boolean(data)));
  }, [viewer, target, id]);

  const cls = `inline-flex items-center gap-1.5 rounded-full font-semibold text-forest-900 hover:bg-sand disabled:opacity-60 ${compact ? "min-h-9 px-2 text-sm" : "min-h-11 border border-sand-strong bg-white px-4 text-sm"}`;
  const heart = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true" className={liked ? "text-gold-600" : ""}>
      <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4.5 4.5 8.5C19 16.65 12 21 12 21z" />
    </svg>
  );
  const label = `${n} ${n === 1 ? "like" : "likes"}`;

  if (!ready || disabled) {
    return (
      <span className={cls} aria-label={label}>
        {heart} {n}
      </span>
    );
  }
  if (participationBlock(viewer)) {
    return (
      <Link href={viewer ? "/account" : `/sign-in?next=${encodeURIComponent(pathname)}`} className={cls} aria-label={`${label}. Sign in to like`}>
        {heart} {n}
      </Link>
    );
  }

  const toggle = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    setBusy(true);
    setError("");
    const { error: e } = liked
      ? await supabase.from("likes").delete().eq("user_id", viewer.id).eq("target_type", target).eq("target_id", id)
      : await supabase.from("likes").insert({ user_id: viewer.id, target_type: target, target_id: id });
    setBusy(false);
    if (e) return setError(friendlyError(e.message));
    setLiked(!liked);
    setN((v) => Math.max(0, v + (liked ? -1 : 1)));
  };

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={liked} aria-label={liked ? `Unlike (${label})` : `Like (${label})`} className={cls}>
        {heart} {n}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

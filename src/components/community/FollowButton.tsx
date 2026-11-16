"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/community/types";
import { participationBlock, useViewer } from "./useViewer";

export function FollowButton({ memberId, name }: { memberId: string; name: string }) {
  const { viewer, ready } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewer.id)
      .eq("followee_id", memberId)
      .maybeSingle()
      .then(({ data }) => setFollowing(Boolean(data)));
  }, [viewer, memberId]);

  if (!ready || viewer?.id === memberId) return null;
  const base = "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold disabled:opacity-60";
  if (participationBlock(viewer)) {
    return (
      <Link href={viewer ? "/account" : `/sign-in?next=${encodeURIComponent(pathname)}`} className={`${base} bg-forest-900 text-cream`}>
        Follow
      </Link>
    );
  }

  const toggle = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    setBusy(true);
    setError("");
    const { error: e } = following
      ? await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("followee_id", memberId)
      : await supabase.from("follows").insert({ follower_id: viewer.id, followee_id: memberId });
    setBusy(false);
    if (e) return setError(friendlyError(e.message));
    setFollowing(!following);
    router.refresh();
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
        className={`${base} ${following ? "border border-forest-900 bg-white text-forest-900" : "bg-forest-900 text-cream hover:bg-forest-800"}`}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

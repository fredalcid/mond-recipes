"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/community/types";
import { useViewer } from "./useViewer";

/** Block or unblock a member. Blocking hides their content from you and stops them following or replying to you. */
export function BlockButton({ memberId, name }: { memberId: string; name: string }) {
  const { viewer, ready } = useViewer();
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", viewer.id)
      .eq("blocked_id", memberId)
      .maybeSingle()
      .then(({ data }) => setBlocked(Boolean(data)));
  }, [viewer, memberId]);

  if (!ready || !viewer || viewer.id === memberId) return null;

  const toggle = async () => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    if (!blocked && !window.confirm(`Block ${name}? You won't see their posts, comments or reviews, and they won't be able to follow you or reply to you.`)) return;
    const { error: e } = blocked
      ? await supabase.from("blocks").delete().eq("blocker_id", viewer.id).eq("blocked_id", memberId)
      : await supabase.from("blocks").insert({ blocker_id: viewer.id, blocked_id: memberId });
    if (e) return setError(friendlyError(e.message));
    setBlocked(!blocked);
    router.refresh();
  };

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={toggle} className="min-h-11 rounded-full border border-sand-strong bg-white px-4 text-sm font-semibold text-ink-muted hover:text-ink">
        {blocked ? "Unblock" : "Block"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

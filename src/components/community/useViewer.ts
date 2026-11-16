"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

export type Viewer = { id: string; username: string; displayName: string; verified: boolean; suspended: boolean; isModerator: boolean };

let cached: Promise<Viewer | null> | null = null;

async function loadViewer(): Promise<Viewer | null> {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, is_suspended").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  return {
    id: user.id,
    username: profile?.username ?? "",
    displayName: profile?.display_name ?? "Member",
    verified: Boolean(user.email_confirmed_at),
    suspended: Boolean(profile?.is_suspended),
    isModerator: (roles ?? []).some((r) => ["moderator", "super_admin", "editor"].includes(r.role)),
  };
}

/**
 * The signed-in member, looked up once per page in the browser so public
 * pages can stay cached. `ready` is false until the lookup finishes.
 */
export function useViewer(): { viewer: Viewer | null; ready: boolean } {
  const [state, setState] = useState<{ viewer: Viewer | null; ready: boolean }>({ viewer: null, ready: false });
  useEffect(() => {
    let alive = true;
    cached ??= loadViewer().catch(() => null);
    cached.then((viewer) => alive && setState({ viewer, ready: true }));
    const supabase = getBrowserClient();
    const sub = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        cached = loadViewer().catch(() => null);
        cached.then((viewer) => alive && setState({ viewer, ready: true }));
      }
    });
    return () => {
      alive = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);
  return state;
}

/** Why the viewer can't take part yet, or null if they can. */
export function participationBlock(viewer: Viewer | null): "signin" | "verify" | "suspended" | null {
  if (!viewer) return "signin";
  if (!viewer.verified) return "verify";
  if (viewer.suspended) return "suspended";
  return null;
}

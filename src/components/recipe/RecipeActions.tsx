"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/env";

const UUID = /^[0-9a-f-]{36}$/i;
const btn = "inline-flex min-h-11 items-center gap-2 rounded-full border border-sand-strong bg-white px-4 text-sm font-semibold text-forest-900 hover:border-forest-900 disabled:opacity-60";

/** Save, share and print. Saving needs a signed-in member; Row Level Security protects each member's list. */
export function RecipeActions({ recipeId, title }: { recipeId: string; title: string }) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canSave = UUID.test(recipeId) && isSupabaseConfigured();

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !UUID.test(recipeId)) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      setUserId(data.user.id);
      const { data: row } = await supabase.from("saved_recipes").select("recipe_id").eq("recipe_id", recipeId).maybeSingle();
      if (!cancelled) setSaved(Boolean(row));
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const toggleSave = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !userId) return;
    setBusy(true);
    const { error } = saved
      ? await supabase.from("saved_recipes").delete().eq("recipe_id", recipeId).eq("user_id", userId)
      : await supabase.from("saved_recipes").insert({ recipe_id: recipeId, user_id: userId });
    setBusy(false);
    if (error) return setMessage("Couldn't update your saved recipes. Please try again.");
    setSaved(!saved);
    setMessage(saved ? "Removed from your saved recipes." : "Saved to your recipes.");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Mònd Recipes`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      /* cancelled by the user */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-print-hide>
      {!canSave ? (
        <button type="button" className={btn} disabled title="Saving works once member accounts are switched on">
          <Heart filled={false} /> Save
        </button>
      ) : userId ? (
        <button type="button" onClick={toggleSave} disabled={busy} aria-pressed={saved} className={btn}>
          <Heart filled={saved} /> {saved ? "Saved" : "Save"}
        </button>
      ) : (
        <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={btn}>
          <Heart filled={false} /> Sign in to save
        </Link>
      )}
      <button type="button" onClick={share} className={btn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
        Print
      </button>
      <span role="status" className="text-sm text-ink-muted">
        {message}
      </span>
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.7 4.5 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

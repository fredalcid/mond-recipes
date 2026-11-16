"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/env";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Sign-in / Join links for visitors, or the account menu for members.
 * Runs in the browser so public pages stay cacheable.
 */
export function AuthNav({ layout = "row" }: { layout?: "row" | "stack" }) {
  const [user, setUser] = useState<User | null>(null);
  // Without Supabase there is no session to look up, so links show straight away.
  const [ready, setReady] = useState(() => !isSupabaseConfigured());

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div aria-hidden="true" className={layout === "row" ? "h-10 w-44" : "h-24"} />;
  }

  if (user) return <AccountMenu user={user} layout={layout} />;

  return (
    <div className={layout === "row" ? "flex items-center gap-2" : "flex flex-col gap-3"}>
      <Link href="/sign-in" className={buttonClasses("ghost", "sm", layout === "stack" ? "w-full" : "")}>
        Sign in
      </Link>
      <Link href="/join" className={buttonClasses("primary", "sm", layout === "stack" ? "w-full" : "")}>
        Join
      </Link>
    </div>
  );
}

function AccountMenu({ user, layout }: { user: User; layout: "row" | "stack" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? "Account";
  const initial = name.trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (layout === "stack") {
    return (
      <div className="flex flex-col gap-1">
        <p className="px-1 pb-1 text-sm text-ink-muted">Signed in as {name}</p>
        <Link href="/account" className="rounded-lg px-3 py-3 font-medium hover:bg-sand">
          My account
        </Link>
        <form action="/auth/sign-out" method="post">
          <button type="submit" className="w-full rounded-lg px-3 py-3 text-left font-medium hover:bg-sand">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-sand-strong bg-white pr-3 pl-1 text-sm font-semibold hover:border-forest-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-900 text-cream">{initial}</span>
        <span className="max-w-32 truncate">{name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-sand-strong bg-white p-2 shadow-card">
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sand">
            My account
          </Link>
          <form action="/auth/sign-out" method="post">
            <button role="menuitem" type="submit" className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-sand">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

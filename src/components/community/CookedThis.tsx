"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { memberFromRow, storageUrl } from "@/lib/community/types";
import { COOKED_SELECT } from "@/lib/community/queries";
import { youtubeThumbnail } from "@/lib/content/types";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Item = { id: string; image: string | null; alt: string; author: string; isVideo: boolean };

/** Approved member photos and videos of this recipe, with a link to add your own. */
export function CookedThis({ recipeId, recipeSlug }: { recipeId: string; recipeSlug: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const configured = Boolean(getBrowserClient());

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    supabase
      .from("community_posts")
      .select(COOKED_SELECT)
      .eq("recipe_id", recipeId)
      .in("status", ["approved", "reported"])
      .in("kind", ["photo", "video"])
      .order("approved_at", { ascending: false })
      .limit(12)
      .then(({ data }) =>
        setItems(
          ((data ?? []) as any[]).map((p) => {
            const m = [...(p.post_media ?? [])].sort((a: any, b: any) => a.position - b.position)[0];
            const author = memberFromRow(p.author).displayName;
            return {
              id: p.id,
              image: m?.youtube_id ? youtubeThumbnail(m.youtube_id) : m?.media_type === "image" ? storageUrl("community", m.storage_path) : null,
              alt: m?.alt || `Photo by ${author}`,
              author,
              isVideo: p.kind === "video",
            };
          }),
        ),
      );
  }, [recipeId]);

  if (!configured) return null;
  return (
    <section aria-labelledby="cooked-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="cooked-title" className="text-3xl font-semibold text-forest-900">
          Cooked by the community
        </h2>
        <Link href={`/community/new?recipe=${recipeSlug}&kind=photo`} className="inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-semibold text-forest-950 hover:bg-gold-600">
          I made this
        </Link>
      </div>
      {items && items.length === 0 && <p className="mt-4 text-ink-muted">No photos yet. Made it? Share a photo of how it turned out.</p>}
      {items && items.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/community/posts/${i.id}`} className="relative block aspect-square overflow-hidden rounded-xl bg-sand">
                {i.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- member upload
                  <img src={i.image} alt={i.alt} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center p-2 text-center text-xs">{i.isVideo ? `Video by ${i.author}` : i.author}</span>
                )}
                {i.isVideo && <span className="absolute right-1.5 bottom-1.5 rounded-full bg-forest-950/75 px-2 text-xs text-cream">▶ Video</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

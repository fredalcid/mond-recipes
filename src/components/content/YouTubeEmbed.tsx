"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Privacy-friendly video: shows a thumbnail first and only loads YouTube
 * (from youtube-nocookie.com) after the visitor presses play.
 */
export function YouTubeEmbed({ id, title, thumbnail }: { id: string; title: string; thumbnail: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-forest-950">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play video: ${title}`}>
          <Image src={thumbnail} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-90" />
          <span className="absolute top-1/2 left-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold-500 text-forest-950 shadow-lg transition-transform group-hover:scale-110">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Plays from YouTube</span>
        </button>
      )}
    </div>
  );
}

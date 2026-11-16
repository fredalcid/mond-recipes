import Image from "next/image";
import Link from "next/link";
import type { VideoSummary } from "@/lib/content/types";

export function formatDuration(s: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function VideoCard({ video }: { video: VideoSummary }) {
  const d = formatDuration(video.durationSeconds);
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-card bg-forest-950">
        <Image src={video.thumbnailUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold-500 text-forest-950">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        {d && <span className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">{d}</span>}
      </div>
      {video.collection && <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{video.collection}</p>}
      <h3 className="text-lg leading-snug font-semibold text-forest-900">
        <Link href={`/videos/${video.slug}`} className="after:absolute after:inset-0">
          {video.title}
        </Link>
      </h3>
    </article>
  );
}

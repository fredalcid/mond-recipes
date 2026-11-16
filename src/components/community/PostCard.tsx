import Link from "next/link";
import { YouTubeEmbed } from "@/components/content/YouTubeEmbed";
import { youtubeThumbnail } from "@/lib/content/types";
import { timeAgo, type Post, type PostMedia } from "@/lib/community/types";
import { MemberLine } from "./MemberAvatar";

const KIND_LABEL = { photo: "Photo", video: "Video", tip: "Cooking tip" } as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for review",
  rejected: "Not approved",
  removed: "Removed by a moderator",
  reported: "",
  approved: "",
};

/** Card for feeds. Media isn't playable here; the card links to the post. */
export function PostCard({ post, showStatus = false }: { post: Post; showStatus?: boolean }) {
  const cover = post.media[0];
  const href = `/community/posts/${post.id}`;
  const status = showStatus ? STATUS_LABEL[post.status] : "";
  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-sand-strong bg-white shadow-card">
      {cover && (
        <Link href={href} className="relative block aspect-square overflow-hidden bg-sand" tabIndex={-1} aria-hidden="true">
          <MediaThumb media={cover} />
          {post.media.length > 1 && <span className="absolute top-3 right-3 rounded-full bg-forest-950/75 px-2.5 py-1 text-xs font-semibold text-cream">1/{post.media.length}</span>}
          {cover.type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-950/70 text-cream">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          )}
        </Link>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-olive-700 uppercase">
          {KIND_LABEL[post.kind]}
          {post.challenge && <span className="rounded-full bg-gold-500/25 px-2 py-0.5 tracking-normal text-forest-900 normal-case">{post.challenge.title}</span>}
          {status && <span className="rounded-full bg-sand px-2 py-0.5 tracking-normal text-ink normal-case">{status}</span>}
        </div>
        <Link href={href} className="line-clamp-4 text-[16px] leading-relaxed whitespace-pre-line text-ink hover:underline">
          {post.body}
        </Link>
        {post.recipe && (
          <p className="text-sm text-ink-muted">
            Made:{" "}
            <Link href={post.recipe.kind === "drink" ? `/drinks-tea/${post.recipe.slug}` : `/recipes/${post.recipe.slug}`} className="font-semibold text-forest-900 hover:underline">
              {post.recipe.title}
            </Link>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <MemberLine member={post.author} meta={<time dateTime={post.approvedAt ?? post.createdAt}>{timeAgo(post.approvedAt ?? post.createdAt)}</time>} />
          <span className="flex shrink-0 items-center gap-3 text-sm text-ink-muted">
            <span aria-label={`${post.likeCount} likes`}>♥ {post.likeCount}</span>
            <span aria-label={`${post.commentCount} comments`}>💬 {post.commentCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function MediaThumb({ media }: { media: PostMedia }) {
  if (media.youtubeId) {
    // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
    return <img src={youtubeThumbnail(media.youtubeId)} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  if (media.type === "video") {
    return <video src={`${media.url}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- member upload served from Storage
  return <img src={media.url ?? ""} alt={media.alt ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />;
}

/** Full-size media on the post page. Uploaded videos stream from Storage; YouTube loads on demand. */
export function PostMediaView({ media, title }: { media: PostMedia[]; title: string }) {
  if (media.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {media.map((m, i) =>
        m.youtubeId ? (
          <YouTubeEmbed key={i} id={m.youtubeId} title={title} thumbnail={youtubeThumbnail(m.youtubeId)} />
        ) : m.type === "video" ? (
          <video key={i} src={m.url ?? undefined} controls preload="metadata" playsInline className="max-h-[80vh] w-full rounded-card bg-forest-950">
            <track kind="captions" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- member upload served from Storage
          <img key={i} src={m.url ?? ""} alt={m.alt ?? `Photo ${i + 1}`} className="max-h-[85vh] w-full rounded-card bg-sand object-contain" />
        ),
      )}
    </div>
  );
}

export function PostGrid({ posts, showStatus, empty }: { posts: Post[]; showStatus?: boolean; empty?: React.ReactNode }) {
  if (posts.length === 0) return <>{empty}</>;
  return (
    <ul className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}

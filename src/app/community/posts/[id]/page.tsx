import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { FormMessage } from "@/components/ui/Field";
import { MemberAvatar } from "@/components/community/MemberAvatar";
import { FollowButton } from "@/components/community/FollowButton";
import { LikeButton } from "@/components/community/LikeButton";
import { ReportButton } from "@/components/community/ReportButton";
import { CommentThread } from "@/components/community/CommentThread";
import { PostMediaView } from "@/components/community/PostCard";
import { ShareButtons } from "@/components/content/ShareButtons";
import { getCurrentMember } from "@/lib/auth";
import { getPost } from "@/lib/community/server";
import { timeAgo } from "@/lib/community/types";
import { deletePost } from "@/app/account/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const KIND = { photo: "Photo", video: "Video", tip: "Cooking tip" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).id);
  if (!post) return { title: "Post not found", robots: { index: false } };
  const visible = post.status === "approved" || post.status === "reported";
  const title = `${KIND[post.kind]} by ${post.author.displayName}`;
  const image = post.media.find((m) => m.type === "image")?.url;
  return {
    title,
    description: post.body.slice(0, 160),
    alternates: { canonical: `/community/posts/${post.id}` },
    robots: visible ? undefined : { index: false },
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const [post, viewer] = await Promise.all([getPost(id), getCurrentMember()]);
  if (!post) notFound();
  const visible = post.status === "approved" || post.status === "reported";
  const mine = viewer?.id === post.author.id;

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Community", href: "/community" }, { label: KIND[post.kind] }]} />

      {!visible && (
        <div className="mb-6">
          <FormMessage tone={post.status === "pending" ? "info" : "error"}>
            {post.status === "pending" && "This post is waiting for review. Only you and our moderators can see it."}
            {post.status === "rejected" && `This post wasn't approved${post.moderationNote ? `: ${post.moderationNote}` : "."}`}
            {post.status === "removed" && `This post was removed by a moderator${post.moderationNote ? `: ${post.moderationNote}` : "."}`}
          </FormMessage>
        </div>
      )}

      <article className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MemberAvatar member={post.author} />
            <div>
              <Link href={`/members/${post.author.username}`} className="font-semibold text-forest-900 hover:underline">
                {post.author.displayName}
              </Link>
              <p className="text-sm text-ink-muted">
                {KIND[post.kind]} · <time dateTime={post.approvedAt ?? post.createdAt}>{timeAgo(post.approvedAt ?? post.createdAt)}</time>
              </p>
            </div>
          </div>
          {!mine && <FollowButton memberId={post.author.id} name={post.author.displayName} />}
        </header>

        <h1 className="sr-only">
          {KIND[post.kind]} by {post.author.displayName}
        </h1>
        <PostMediaView media={post.media} title={`${KIND[post.kind]} by ${post.author.displayName}`} />
        <p className="text-xl leading-relaxed whitespace-pre-line">{post.body}</p>

        {(post.recipe || post.challenge) && (
          <div className="flex flex-wrap gap-3">
            {post.recipe && (
              <Link href={post.recipe.kind === "drink" ? `/drinks-tea/${post.recipe.slug}` : `/recipes/${post.recipe.slug}`} className="rounded-xl bg-sand/70 px-4 py-3 hover:bg-sand">
                <span className="block text-xs font-semibold tracking-wide text-olive-700 uppercase">Recipe</span>
                <span className="font-semibold text-forest-900">{post.recipe.title}</span>
              </Link>
            )}
            {post.challenge && (
              <Link href={`/community/challenges/${post.challenge.slug}`} className="rounded-xl bg-gold-500/25 px-4 py-3 hover:bg-gold-500/40">
                <span className="block text-xs font-semibold tracking-wide text-forest-900 uppercase">Challenge entry</span>
                <span className="font-semibold text-forest-900">{post.challenge.title}</span>
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-y border-sand-strong py-4">
          <LikeButton target="post" id={post.id} count={post.likeCount} disabled={!visible} />
          {visible && <ShareButtons title={`${KIND[post.kind]} by ${post.author.displayName}`} />}
          <ReportButton target="post" id={post.id} ownerId={post.author.id} />
          {mine && (
            <form action={deletePost} className="ml-auto">
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" className="min-h-11 rounded-full px-4 text-sm font-semibold text-danger hover:bg-sand">
                Delete post
              </button>
            </form>
          )}
        </div>
      </article>

      <div className="mt-10">
        <CommentThread target={{ postId: post.id }} closed={!visible} />
      </div>
    </Container>
  );
}

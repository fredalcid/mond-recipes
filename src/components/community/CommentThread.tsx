"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { friendlyError, memberFromRow, timeAgo, type Comment } from "@/lib/community/types";
import { COMMENT_SELECT } from "@/lib/community/queries";
import { MemberLine } from "./MemberAvatar";
import { LikeButton } from "./LikeButton";
import { ReportButton } from "./ReportButton";
import { JoinPrompt } from "./JoinPrompt";
import { participationBlock, useViewer } from "./useViewer";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

type Target = { recipeId: string; postId?: never } | { postId: string; recipeId?: never };

/**
 * Comments with one level of replies. Loaded in the browser so recipe pages stay
 * cached; Row Level Security decides what each visitor sees and may do.
 */
export function CommentThread({ target, title = "Comments", closed = false }: { target: Target; title?: string; closed?: boolean }) {
  const { viewer, ready } = useViewer();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const configured = Boolean(getBrowserClient());

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase) return setComments([]);
    let q = supabase
      .from("comments")
      .select(COMMENT_SELECT)
      .in("status", ["approved", "reported"])
      .order("created_at", { ascending: true })
      .limit(500);
    q = target.recipeId ? q.eq("recipe_id", target.recipeId) : q.eq("post_id", target.postId!);
    const { data, error } = await q;
    if (error) return setLoadError(true);
    setComments(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        parentId: r.parent_id,
        body: r.body,
        status: r.status,
        isEdited: r.is_edited,
        likeCount: r.like_count,
        createdAt: r.created_at,
        author: memberFromRow(r.author),
      })),
    );
  }, [target.recipeId, target.postId]);

  useEffect(() => {
    // Loads once the page is in the browser; the list is not part of the cached page.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching data on mount
    void load();
  }, [load]);

  // A reply whose comment was removed is shown on its own rather than lost.
  const ids = new Set((comments ?? []).map((c) => c.id));
  const roots = (comments ?? []).filter((c) => !c.parentId || !ids.has(c.parentId));
  const replies = (id: string) => (comments ?? []).filter((c) => c.parentId === id);
  const block = participationBlock(viewer);
  const total = comments?.length ?? 0;

  return (
    <section id="comments" aria-labelledby="comments-title" className="scroll-mt-24">
      <h2 id="comments-title" className="text-3xl font-semibold text-forest-900">
        {title} {total > 0 && <span className="text-ink-muted">({total})</span>}
      </h2>
      <div className="mt-6 flex flex-col gap-6">
        {!configured ? (
          <p className="text-ink-muted">Comments open once member accounts are switched on.</p>
        ) : closed ? (
          <p className="text-ink-muted">Comments open once this is published.</p>
        ) : ready && block ? (
          <JoinPrompt reason={block} action="comment" />
        ) : ready ? (
          <CommentForm target={target} onPosted={load} />
        ) : null}

        {loadError && <p className="text-danger">Comments couldn&apos;t be loaded. Please refresh the page.</p>}
        {comments && roots.length === 0 && configured && !closed && <p className="text-ink-muted">No comments yet. Be the first to share your thoughts.</p>}
        <ol className="flex flex-col gap-6">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentItem comment={c} canReply={!block} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onChanged={load} viewerId={viewer?.id} />
              {(replies(c.id).length > 0 || replyTo === c.id) && (
                <ol className="mt-4 ml-5 flex flex-col gap-4 border-l-2 border-sand-strong pl-4 sm:ml-10">
                  {replies(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentItem comment={r} canReply={!block} onReply={() => setReplyTo(c.id)} onChanged={load} viewerId={viewer?.id} />
                    </li>
                  ))}
                  {replyTo === c.id && !block && (
                    <li>
                      <CommentForm
                        target={target}
                        parentId={c.id}
                        autoFocus
                        onPosted={async () => {
                          setReplyTo(null);
                          await load();
                        }}
                        onCancel={() => setReplyTo(null)}
                      />
                    </li>
                  )}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CommentItem({ comment: c, canReply, onReply, onChanged, viewerId }: { comment: Comment; canReply: boolean; onReply: () => void; onChanged: () => void; viewerId?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.body);
  const [error, setError] = useState("");
  const mine = viewerId === c.author.id;

  const save = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !text.trim()) return;
    const { error: e } = await supabase.from("comments").update({ body: text.trim() }).eq("id", c.id);
    if (e) return setError(friendlyError(e.message));
    setEditing(false);
    onChanged();
  };
  const remove = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !window.confirm("Delete this comment?")) return;
    const { error: e } = await supabase.from("comments").delete().eq("id", c.id);
    if (e) return setError(friendlyError(e.message));
    onChanged();
  };

  return (
    <article className="flex flex-col gap-2">
      <MemberLine member={c.author} meta={<time dateTime={c.createdAt}>{timeAgo(c.createdAt)}{c.isEdited ? " · edited" : ""}</time>} />
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={`edit-${c.id}`}>
            Edit your comment
          </label>
          <textarea id={`edit-${c.id}`} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} className="rounded-xl border border-sand-strong bg-white px-3 py-2" />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="min-h-10 rounded-full bg-forest-900 px-4 text-sm font-semibold text-cream">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-10 rounded-full px-4 text-sm font-semibold hover:bg-sand">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line text-[17px] leading-relaxed">{c.body}</p>
      )}
      <div className="-ml-2 flex flex-wrap items-center gap-1">
        <LikeButton target="comment" id={c.id} count={c.likeCount} compact />
        {canReply && (
          <button type="button" onClick={onReply} className="min-h-9 rounded-full px-2 text-sm font-semibold text-forest-900 hover:bg-sand">
            Reply
          </button>
        )}
        {mine && !editing && (
          <>
            <button type="button" onClick={() => setEditing(true)} className="min-h-9 rounded-full px-2 text-sm text-ink-muted hover:bg-sand">
              Edit
            </button>
            <button type="button" onClick={remove} className="min-h-9 rounded-full px-2 text-sm text-ink-muted hover:bg-sand">
              Delete
            </button>
          </>
        )}
        <ReportButton target="comment" id={c.id} ownerId={c.author.id} compact />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}

function CommentForm({ target, parentId, onPosted, onCancel, autoFocus }: { target: Target; parentId?: string; onPosted: () => Promise<void> | void; onCancel?: () => void; autoFocus?: boolean }) {
  const { viewer } = useViewer();
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !viewer || !text.trim()) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("comments").insert({
      author_id: viewer.id,
      recipe_id: target.recipeId ?? null,
      post_id: target.postId ?? null,
      parent_id: parentId ?? null,
      body: text.trim(),
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setText("");
    await onPosted();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={id} className={parentId ? "sr-only" : "text-sm font-semibold"}>
        {parentId ? "Write a reply" : "Add a comment"}
      </label>
      <textarea
        id={id}
        rows={parentId ? 2 : 3}
        maxLength={2000}
        required
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Share a tip, a question or how it turned out…"}
        className="rounded-xl border border-sand-strong bg-white px-3 py-2"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || !text.trim()} className="min-h-11 rounded-full bg-forest-900 px-5 text-sm font-semibold text-cream disabled:opacity-50">
          {busy ? "Posting…" : parentId ? "Reply" : "Post comment"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 text-sm font-semibold hover:bg-sand">
            Cancel
          </button>
        )}
        <span className="ml-auto text-xs text-ink-muted">Be kind. See our community guidelines.</span>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { friendlyError, memberFromRow, timeAgo, type Review } from "@/lib/community/types";
import { REVIEW_SELECT } from "@/lib/community/queries";
import { MemberLine } from "./MemberAvatar";
import { ReportButton } from "./ReportButton";
import { JoinPrompt } from "./JoinPrompt";
import { participationBlock, useViewer } from "./useViewer";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */

export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-gold-600" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={value >= i - 0.25 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
          <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** Ratings and reviews from members. Averages are calculated by the database from these reviews only. */
export function ReviewsSection({ recipeId, authorId }: { recipeId: string; authorId: string | null }) {
  const { viewer, ready } = useViewer();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const configured = Boolean(getBrowserClient());

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase) return setReviews([]);
    const { data } = await supabase
      .from("recipe_reviews")
      .select(REVIEW_SELECT)
      .eq("recipe_id", recipeId)
      .in("status", ["approved", "reported"])
      .order("created_at", { ascending: false })
      .limit(200);
    setReviews(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        author: memberFromRow(r.author),
      })),
    );
  }, [recipeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching data on mount
    void load();
  }, [load]);

  const list = reviews ?? [];
  const count = list.length;
  const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  const mine = viewer ? list.find((r) => r.author.id === viewer.id) : undefined;
  const block = participationBlock(viewer);
  const isAuthor = Boolean(viewer && authorId && viewer.id === authorId);

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-title" className="text-3xl font-semibold text-forest-900">
          Ratings &amp; reviews
        </h2>
        {count > 0 && (
          <p className="flex items-center gap-2 text-lg">
            <Stars value={average} />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-ink-muted">
              from {count} {count === 1 ? "review" : "reviews"}
            </span>
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-6">
        {!configured ? (
          <p className="text-ink-muted">No ratings yet. Reviews open once member accounts are switched on.</p>
        ) : !ready ? null : block ? (
          <JoinPrompt reason={block} action="rate this recipe" />
        ) : isAuthor ? (
          <p className="text-sm text-ink-muted">This is your recipe, so you can&apos;t rate it.</p>
        ) : (
          <ReviewForm key={mine?.id ?? "new"} recipeId={recipeId} existing={mine} onSaved={load} />
        )}
        {reviews && count === 0 && configured && <p className="text-ink-muted">No ratings yet. Cooked it? Be the first to review it.</p>}
        <ul className="flex flex-col gap-6">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 border-b border-sand pb-6 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MemberLine member={r.author} meta={<time dateTime={r.createdAt}>{timeAgo(r.createdAt)}</time>} />
                <span className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="sr-only">{r.rating} out of 5 stars</span>
                </span>
              </div>
              {r.body && <p className="whitespace-pre-line text-[17px] leading-relaxed">{r.body}</p>}
              <div className="-ml-2">
                <ReportButton target="review" id={r.id} ownerId={r.author.id} compact />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReviewForm({ recipeId, existing, onSaved }: { recipeId: string; existing?: Review; onSaved: () => Promise<void> }) {
  const { viewer } = useViewer();
  const id = useId();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [open, setOpen] = useState(!existing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  if (existing && !open) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sand/70 px-4 py-3 text-sm">
        <span>
          You rated this <strong>{existing.rating} out of 5</strong>.
        </span>
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-forest-900 underline underline-offset-4">
          Edit your review
        </button>
        {message && <span role="status">{message.text}</span>}
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !viewer) return;
    if (rating < 1) return setMessage({ tone: "error", text: "Choose a star rating." });
    setBusy(true);
    const row = { rating, body: body.trim() || null };
    const { error } = existing
      ? await supabase.from("recipe_reviews").update(row).eq("id", existing.id)
      : await supabase.from("recipe_reviews").insert({ ...row, recipe_id: recipeId, author_id: viewer.id });
    setBusy(false);
    if (error) return setMessage({ tone: "error", text: friendlyError(error.message) });
    setMessage({ tone: "ok", text: "Thanks for your review." });
    setOpen(false);
    await onSaved();
  };
  const remove = async () => {
    const supabase = getBrowserClient();
    if (!supabase || !existing || !window.confirm("Delete your review?")) return;
    await supabase.from("recipe_reviews").delete().eq("id", existing.id);
    await onSaved();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-sand-strong bg-white p-5">
      <fieldset>
        <legend className="text-sm font-semibold">Your rating</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-lg p-1 has-focus-visible:outline-3 has-focus-visible:outline-gold-600">
              <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
              <span className={n <= rating ? "text-gold-600" : "text-sand-strong"}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                </svg>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-body`} className="text-sm font-semibold">
          Your review (optional)
        </label>
        <textarea id={`${id}-body`} rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How did it turn out? Any changes you made?" className="rounded-xl border border-sand-strong px-3 py-2" />
      </div>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-danger" : "text-sm"}>
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-forest-900 px-5 text-sm font-semibold text-cream disabled:opacity-50">
          {busy ? "Saving…" : existing ? "Update review" : "Post review"}
        </button>
        {existing && (
          <>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full px-4 text-sm font-semibold hover:bg-sand">
              Cancel
            </button>
            <button type="button" onClick={remove} className="ml-auto min-h-11 rounded-full px-4 text-sm font-semibold text-danger hover:bg-sand">
              Delete review
            </button>
          </>
        )}
      </div>
    </form>
  );
}

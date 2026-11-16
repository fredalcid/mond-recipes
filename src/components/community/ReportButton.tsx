"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { REPORT_REASONS, friendlyError } from "@/lib/community/types";
import { participationBlock, useViewer } from "./useViewer";

type Target = "recipe" | "post" | "comment" | "review" | "profile";
const NOUN: Record<Target, string> = { recipe: "recipe", post: "post", comment: "comment", review: "review", profile: "member" };

/** Opens a small dialog to report content to the moderators. */
export function ReportButton({ target, id, ownerId, compact = false, label = "Report" }: { target: Target; id: string; ownerId?: string | null; compact?: boolean; label?: string }) {
  const { viewer, ready } = useViewer();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!ready || (viewer && ownerId && viewer.id === ownerId)) return null;
  const cls = compact ? "min-h-9 rounded-full px-2 text-sm text-ink-muted hover:bg-sand hover:text-ink" : "min-h-11 rounded-full border border-sand-strong bg-white px-4 text-sm font-semibold text-ink-muted hover:text-ink";

  if (participationBlock(viewer)) {
    return (
      <Link href={viewer ? "/account" : `/sign-in?next=${encodeURIComponent(pathname)}`} className={`${cls} inline-flex items-center`}>
        {label}
      </Link>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase || !viewer || !reason) return;
    setState("busy");
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: viewer.id, target_type: target, target_id: id, reason, details: details.trim() || null });
    if (error && !/duplicate key/i.test(error.message)) {
      setState("error");
      setMessage(friendlyError(error.message));
      return;
    }
    setState("done");
    setMessage(error ? "You've already reported this. Our moderators will look at it." : "Thank you. Our moderators will review it.");
  };

  return (
    <>
      <button type="button" className={`${cls} inline-flex items-center`} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        {label}
      </button>
      <dialog ref={dialog} aria-labelledby={`${uid}-t`} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-sand-strong bg-ivory p-0 text-ink backdrop:bg-forest-950/50">
        <form onSubmit={submit} className="flex flex-col gap-4 p-6">
          <h2 id={`${uid}-t`} className="text-2xl font-semibold text-forest-900">
            Report this {NOUN[target]}
          </h2>
          {state === "done" ? (
            <p role="status">{message}</p>
          ) : (
            <>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-2 text-sm font-semibold">What&apos;s wrong?</legend>
                {REPORT_REASONS.map(([value, text]) => (
                  <label key={value} className="flex min-h-10 items-center gap-3 text-sm">
                    <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="h-5 w-5 accent-forest-900" required />
                    {text}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-d`} className="text-sm font-semibold">
                  Anything else we should know? (optional)
                </label>
                <textarea id={`${uid}-d`} rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className="rounded-xl border border-sand-strong bg-white px-3 py-2" />
              </div>
              {state === "error" && (
                <p role="alert" className="text-sm text-danger">
                  {message}
                </p>
              )}
              <p className="text-xs text-ink-muted">The member won&apos;t see who reported them.</p>
            </>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 rounded-full px-5 font-semibold hover:bg-sand">
              {state === "done" ? "Close" : "Cancel"}
            </button>
            {state !== "done" && (
              <button type="submit" disabled={!reason || state === "busy"} className="min-h-11 rounded-full bg-forest-900 px-5 font-semibold text-cream disabled:opacity-50">
                {state === "busy" ? "Sending…" : "Send report"}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}

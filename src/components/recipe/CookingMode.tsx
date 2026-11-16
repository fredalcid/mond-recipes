"use client";

import { useEffect, useRef, useState } from "react";
import { StepTimer } from "./StepTimer";

type Step = { position: number; body: string; timerSeconds: number | null };

/**
 * Full-screen, one-step-at-a-time view for cooking. Large text, keyboard
 * arrows, step progress, timers, and the screen kept awake where supported.
 */
export function CookingMode({
  title,
  steps,
  ingredients,
  onClose,
}: {
  title: string;
  steps: Step[];
  ingredients: string[];
  onClose: () => void;
}) {
  // Index -1 is the ingredient checklist shown before step 1.
  const [index, setIndex] = useState(-1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const last = steps.length - 1;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});

    return () => {
      document.body.style.overflow = previousOverflow;
      lock?.release().catch(() => {});
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(last, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(-1, i - 1));
      else if (e.key === "Tab" && dialogRef.current) {
        // Keep keyboard focus inside the dialog.
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button, [href], input");
        if (!f.length) return;
        const first = f[0];
        const end = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          end.focus();
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const step = index >= 0 ? steps[index] : null;
  const progress = Math.round(((index + 1) / steps.length) * 100);

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cook-title" className="fixed inset-0 z-50 flex flex-col bg-ivory">
      <div className="flex items-center justify-between gap-4 border-b border-sand-strong px-4 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-olive-700 uppercase">Cooking mode</p>
          <h2 id="cook-title" className="truncate text-xl font-semibold text-forest-900">
            {title}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="min-h-11 shrink-0 rounded-full border border-sand-strong bg-white px-5 font-semibold text-forest-900 hover:border-forest-900"
        >
          Exit
        </button>
      </div>

      <div className="h-1.5 bg-sand" role="progressbar" aria-label="Recipe progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, progress)}>
        <div className="h-full bg-olive-500 transition-[width] duration-300" style={{ width: `${Math.max(0, progress)}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl" aria-live="polite">
          {step ? (
            <>
              <p className="text-sm font-semibold text-ink-muted">
                Step {index + 1} of {steps.length}
              </p>
              <p className="mt-4 font-display text-3xl leading-snug text-ink sm:text-4xl">{step.body}</p>
              {step.timerSeconds && <StepTimer key={index} seconds={step.timerSeconds} large />}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink-muted">Before you start</p>
              <h3 className="mt-2 text-3xl font-semibold text-forest-900">Gather your ingredients</h3>
              <ul className="mt-6 flex flex-col gap-2">
                {ingredients.map((line, i) => (
                  <li key={i}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-4 rounded-xl bg-white px-4 py-3 text-lg shadow-card">
                      <input type="checkbox" className="h-6 w-6 shrink-0 accent-forest-900" />
                      {line}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-sand-strong bg-white px-4 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(-1, i - 1))}
          disabled={index === -1}
          className="min-h-12 rounded-full border border-sand-strong px-6 font-semibold text-forest-900 hover:border-forest-900 disabled:opacity-40"
        >
          ← Back
        </button>
        <span className="hidden text-sm text-ink-muted sm:block">Use ← → keys to move between steps</span>
        {index < last ? (
          <button type="button" onClick={() => setIndex((i) => i + 1)} className="min-h-12 rounded-full bg-forest-900 px-6 font-semibold text-cream hover:bg-forest-800">
            {index === -1 ? "Start step 1" : "Next step"} →
          </button>
        ) : (
          <button type="button" onClick={onClose} className="min-h-12 rounded-full bg-gold-500 px-6 font-semibold text-forest-950 hover:bg-gold-600">
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

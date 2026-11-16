"use client";

import { formatClock, useCountdown } from "./useCountdown";

export function StepTimer({ seconds, large = false }: { seconds: number; large?: boolean }) {
  const t = useCountdown(seconds);
  const base = large ? "min-h-12 px-5 text-base" : "min-h-10 px-4 text-sm";
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${large ? "mt-6" : "mt-3"}`} data-print-hide>
      <span
        role="timer"
        aria-live={t.done ? "assertive" : "off"}
        className={`rounded-full font-mono font-semibold tabular-nums ${large ? "px-4 py-2 text-2xl" : "px-3 py-1.5 text-sm"} ${
          t.done ? "bg-gold-500 text-forest-950" : "bg-forest-100 text-forest-900"
        }`}
      >
        {t.done ? "Time's up!" : formatClock(t.remaining)}
      </span>
      {!t.done &&
        (t.running ? (
          <button type="button" onClick={t.pause} className={`${base} rounded-full border border-forest-900/30 font-semibold text-forest-900 hover:bg-forest-100`}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={t.start} className={`${base} rounded-full bg-forest-900 font-semibold text-cream hover:bg-forest-800`}>
            {t.remaining < seconds ? "Resume" : `Start ${formatClock(seconds)} timer`}
          </button>
        ))}
      {(t.running || t.remaining < seconds) && (
        <button type="button" onClick={t.reset} className={`${base} rounded-full font-semibold text-ink-muted hover:bg-sand`}>
          Reset
        </button>
      )}
    </div>
  );
}

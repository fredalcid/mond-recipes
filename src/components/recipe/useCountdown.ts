"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function formatClock(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Countdown that stays accurate when the tab is in the background. */
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endsAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, ((endsAt.current ?? Date.now()) - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          /* not supported */
        }
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    endsAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(seconds);
  }, [seconds]);

  return { remaining, running, done: remaining <= 0, start, pause, reset };
}

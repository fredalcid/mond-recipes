"use client";

import { useEffect, useRef, useState } from "react";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filters the country list as you type. Without JavaScript the full list stays visible. */
export function CountryFilter({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLElement>("[data-country-name]") ?? [];
    let n = 0;
    items.forEach((el) => {
      const hit = fold(el.dataset.countryName ?? "").includes(fold(q.trim()));
      el.hidden = !hit;
      if (hit) n++;
    });
    const t = setTimeout(() => setShown(q ? n : null), 0);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <label htmlFor="country-filter" className="text-sm font-semibold">
        Find a country
      </label>
      <input
        id="country-filter"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type a country name"
        className="mt-1.5 mb-5 min-h-11 w-full max-w-sm rounded-xl border border-sand-strong bg-white px-4 text-base focus:border-forest-900"
      />
      <p className="sr-only" aria-live="polite">
        {shown === null ? "" : `${shown} countries shown`}
      </p>
      <div ref={ref}>{children}</div>
      {shown === 0 && <p className="text-ink-muted">No country matches “{q}”.</p>}
    </div>
  );
}

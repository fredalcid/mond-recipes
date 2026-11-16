"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import type { IngredientOption } from "@/lib/data/types";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Choose ingredients you have; the selection lives in the URL so results can be shared. */
export function IngredientPicker({ options, selected }: { options: IngredientOption[]; selected: string[] }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>(selected);
  const [pending, startTransition] = useTransition();

  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const matches = useMemo(() => {
    const q = fold(query.trim());
    return options.filter((o) => !chosen.includes(o.slug) && (!q || fold(o.name).includes(q))).slice(0, q ? 12 : 18);
  }, [options, chosen, query]);

  const apply = (next: string[]) => {
    setChosen(next);
    const sp = new URLSearchParams();
    next.forEach((s) => sp.append("i", s));
    startTransition(() => router.replace(`/ingredients${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  return (
    <div className="rounded-card border border-sand-strong bg-white p-5 sm:p-6">
      <h2 className="font-sans text-base font-semibold text-ink">Your ingredients</h2>
      {chosen.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Nothing chosen yet. Pick a few ingredients below.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Chosen ingredients">
          {chosen.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => apply(chosen.filter((x) => x !== s))}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-forest-900 px-4 text-sm font-semibold text-cream hover:bg-forest-800"
                aria-label={`Remove ${bySlug.get(s)?.name ?? s}`}
              >
                {bySlug.get(s)?.name ?? s}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => apply([])} className="min-h-10 px-3 text-sm font-semibold text-forest-900 underline underline-offset-4">
              Clear all
            </button>
          </li>
        </ul>
      )}

      <label htmlFor={`${id}-find`} className="mt-6 block text-sm font-semibold text-ink">
        Add an ingredient
      </label>
      <input
        id={`${id}-find`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to filter, e.g. garlic"
        autoComplete="off"
        className="mt-1.5 min-h-11 w-full rounded-xl border border-sand-strong bg-ivory px-4 text-base focus:border-forest-900"
      />
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ingredients you can add">
        {matches.map((o) => (
          <li key={o.slug}>
            <button
              type="button"
              disabled={chosen.length >= 30}
              onClick={() => {
                apply([...chosen, o.slug]);
                setQuery("");
              }}
              className="inline-flex min-h-10 items-center gap-1 rounded-full border border-sand-strong bg-white px-4 text-sm font-medium text-forest-900 hover:border-forest-900 disabled:opacity-50"
            >
              <span aria-hidden="true">+</span> {o.name}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="text-sm text-ink-muted">No ingredients match “{query}”.</li>}
      </ul>
      <p className="mt-4 text-xs text-ink-muted" aria-live="polite">
        {pending ? "Updating results…" : "Results update as you choose."}
      </p>
    </div>
  );
}

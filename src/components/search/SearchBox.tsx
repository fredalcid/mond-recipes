"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/lib/data/types";

const RECENT_KEY = "mond:recent-searches";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  try {
    const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: recent searches are optional */
  }
}

function hrefFor(s: Suggestion): string {
  switch (s.kind) {
    case "recipe":
      return `/recipes/${s.slug}`;
    case "drink":
      return `/drinks-tea/${s.slug}`;
    case "country":
      return `/countries/${s.slug}`;
    default:
      return `/recipes?q=${encodeURIComponent(s.label)}`;
  }
}

const KIND_LABEL: Record<Suggestion["kind"], string> = { recipe: "Recipe", drink: "Drink", ingredient: "Ingredient", country: "Country" };

type Item = { label: string; href: string; meta: string };

/**
 * Search field with suggestions and recent searches. Works as a plain GET form
 * without JavaScript; suggestions are an enhancement.
 */
export function SearchBox({
  action = "/recipes",
  defaultValue = "",
  placeholder = "Search recipes or ingredients",
  label = "Search recipes",
  hidden = {},
}: {
  action?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  hidden?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions (debounced) or show recent searches when empty.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      const t = setTimeout(() => setItems(readRecent().map((r) => ({ label: r, href: `${action}?q=${encodeURIComponent(r)}`, meta: "Recent" }))), 0);
      return () => clearTimeout(t);
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setItems(data.suggestions.map((s) => ({ label: s.label, href: hrefFor(s), meta: KIND_LABEL[s.kind] })));
        setActive(-1);
      } catch {
        /* aborted or offline */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, action]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showList = open && items.length > 0;

  return (
    <form
      action={action}
      method="get"
      role="search"
      onSubmit={(e) => {
        if (showList && active >= 0) {
          e.preventDefault();
          router.push(items[active].href);
          setOpen(false);
          return;
        }
        if (value.trim()) saveRecent(value.trim());
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor={`${id}-q`} className="sr-only">
        {label}
      </label>
      <div ref={boxRef} className="relative">
        <div className="flex gap-2 rounded-full border border-sand-strong bg-white p-1.5 shadow-card focus-within:border-forest-900">
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (a + 1) % items.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent px-4 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
          <button type="submit" className="min-h-11 rounded-full bg-forest-900 px-6 font-semibold text-cream hover:bg-forest-800">
            Search
          </button>
        </div>
        {showList && (
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-label="Suggestions"
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-sand-strong bg-white py-2 shadow-card"
          >
            {items.map((it, i) => (
              <li key={`${it.href}-${i}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
                <a
                  href={it.href}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (it.meta === "Recent") saveRecent(it.label);
                    router.push(it.href);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 items-center justify-between gap-4 px-4 text-sm ${i === active ? "bg-sand" : "hover:bg-sand/60"}`}
                >
                  <span className="font-medium text-ink">{it.label}</span>
                  <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{it.meta}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}

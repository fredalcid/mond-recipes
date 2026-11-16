"use client";

import Link from "next/link";
import { useRef } from "react";
import type { FilterOptions, Option } from "@/lib/data/types";
import { SORT_OPTIONS, TIME_OPTIONS } from "@/lib/search-params";

export type FilterValues = Record<string, string | number | undefined>;

type Field = { name: string; label: string; options: Option[]; any: string };

/**
 * All filters live in one GET form, so they always combine. With JavaScript,
 * changing a filter applies it right away; without it, use the Apply button.
 */
export function FilterForm({
  action,
  values,
  options,
  variant,
}: {
  action: string;
  values: FilterValues;
  options: FilterOptions;
  variant: "food" | "drink";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fields: Field[] = [
    { name: "country", label: "Country", options: options.countries, any: "Any country" },
    ...(variant === "drink"
      ? [{ name: "type", label: "Drink type", options: options.drinkCategories, any: "Any type" }]
      : [
          { name: "category", label: "Meal or dish", options: options.categories, any: "Any meal or dish" },
          { name: "cuisine", label: "Cuisine", options: options.cuisines, any: "Any cuisine" },
        ]),
    { name: "diet", label: "Diet", options: options.diets, any: "Any diet" },
    {
      name: "time",
      label: "Total time",
      options: TIME_OPTIONS.map((t) => ({ slug: String(t), name: t === 90 ? "Under 1½ hours" : t === 60 ? "Under 1 hour" : `Under ${t} minutes` })),
      any: "Any time",
    },
    {
      name: "difficulty",
      label: "Difficulty",
      options: [
        { slug: "easy", name: "Easy" },
        { slug: "medium", name: "Medium" },
        { slug: "hard", name: "Hard" },
      ],
      any: "Any level",
    },
    {
      name: "rating",
      label: "Rating",
      options: [
        { slug: "4.5", name: "4.5 stars and up" },
        { slug: "4", name: "4 stars and up" },
        { slug: "3", name: "3 stars and up" },
      ],
      any: "Any rating",
    },
  ];

  const active = fields.filter((f) => values[f.name] !== undefined && values[f.name] !== "").length;
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form ref={formRef} action={action} method="get" aria-label="Filter recipes">
      {values.q && <input type="hidden" name="q" value={String(values.q)} />}
      <details open className="group rounded-card border border-sand-strong bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-forest-900 lg:pointer-events-none">
          <span>
            Filters{active > 0 && <span className="ml-2 rounded-full bg-forest-900 px-2 py-0.5 text-xs text-cream">{active}</span>}
          </span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-180 lg:hidden">
            ▾
          </span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={`filter-${f.name}`} className="text-sm font-semibold text-ink">
                {f.label}
              </label>
              <select
                id={`filter-${f.name}`}
                name={f.name}
                defaultValue={values[f.name] !== undefined ? String(values[f.name]) : ""}
                onChange={submit}
                className="min-h-11 rounded-xl border border-sand-strong bg-ivory px-3 text-[15px] text-ink focus:border-forest-900"
              >
                <option value="">{f.any}</option>
                {f.options.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-sort" className="text-sm font-semibold text-ink">
              Sort by
            </label>
            <select
              id="filter-sort"
              name="sort"
              defaultValue={values.sort ? String(values.sort) : values.q ? "relevance" : "newest"}
              onChange={submit}
              className="min-h-11 rounded-xl border border-sand-strong bg-ivory px-3 text-[15px] text-ink focus:border-forest-900"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <noscript>
            <button type="submit" className="min-h-11 w-full rounded-full bg-forest-900 font-semibold text-cream">
              Apply filters
            </button>
          </noscript>
          {active > 0 && (
            <Link href={values.q ? `${action}?q=${encodeURIComponent(String(values.q))}` : action} className="text-center text-sm font-semibold text-forest-900 underline underline-offset-4">
              Clear all filters
            </Link>
          )}
        </div>
      </details>
    </form>
  );
}

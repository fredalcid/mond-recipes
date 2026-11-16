"use client";

import { useState } from "react";
import type { RecipeIngredient } from "@/lib/data/types";
import { convert, formatQuantity, scale, unitLabel, type MeasureSystem } from "@/lib/units";
import { StepTimer } from "./StepTimer";
import { CookingMode } from "./CookingMode";

type Step = { position: number; body: string; timerSeconds: number | null };

export function ingredientLine(ing: RecipeIngredient, factor: number, system: MeasureSystem) {
  const c = convert(scale(ing.quantity, factor), ing.unit, system, ing.gramsPerCup);
  const qty = formatQuantity(c.quantity, c.unit);
  const unit = unitLabel(c.unit, c.quantity);
  return { amount: [c.approximate && qty ? "≈" : "", qty, unit].filter(Boolean).join(" ").replace("≈ ", "≈"), approximate: c.approximate };
}

/** Ingredients (with servings and unit controls) and the method, plus cooking mode. */
export function RecipeInteractive({
  title,
  baseServings,
  servingUnit,
  ingredients,
  steps,
}: {
  title: string;
  baseServings: number | null;
  servingUnit: string | null;
  ingredients: RecipeIngredient[];
  steps: Step[];
}) {
  const [servings, setServings] = useState(baseServings ?? 1);
  const [system, setSystem] = useState<MeasureSystem>("original");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const factor = baseServings ? servings / baseServings : 1;
  const lines = ingredients.map((i) => ingredientLine(i, factor, system));
  const anyApprox = lines.some((l) => l.approximate);
  const groups = [...new Set(ingredients.map((i) => i.group ?? ""))];
  const unitWord = servingUnit ?? (servings === 1 ? "serving" : "servings");

  return (
    <>
      <div className="flex flex-wrap items-center gap-3" data-print-hide>
        <button
          type="button"
          onClick={() => setCooking(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gold-500 px-6 font-semibold text-forest-950 hover:bg-gold-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 4l14 8-14 8z" />
          </svg>
          Start cooking mode
        </button>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="text-3xl font-semibold text-forest-900">
            Ingredients
          </h2>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-card bg-sand/70 p-4" data-print-hide>
            {baseServings && (
              <div className="flex items-center gap-3">
                <span id="servings-label" className="text-sm font-semibold">
                  Servings
                </span>
                <div className="flex items-center rounded-full border border-sand-strong bg-white" role="group" aria-labelledby="servings-label">
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                    disabled={servings <= 1}
                    aria-label="Fewer servings"
                    className="h-11 w-11 rounded-full text-xl font-semibold text-forest-900 hover:bg-sand disabled:opacity-40"
                  >
                    −
                  </button>
                  <output aria-live="polite" className="min-w-10 text-center font-semibold tabular-nums">
                    {servings}
                  </output>
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.min(100, s + 1))}
                    aria-label="More servings"
                    className="h-11 w-11 rounded-full text-xl font-semibold text-forest-900 hover:bg-sand"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <fieldset className="flex items-center gap-1 rounded-full border border-sand-strong bg-white p-1">
              <legend className="sr-only">Units</legend>
              {(
                [
                  ["original", "As written"],
                  ["metric", "Metric"],
                  ["us", "US"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-gold-600 ${
                    system === value ? "bg-forest-900 text-cream" : "text-forest-900 hover:bg-sand"
                  }`}
                >
                  <input type="radio" name="units" value={value} checked={system === value} onChange={() => setSystem(value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>

          <p className="mt-4 text-sm text-ink-muted">
            Makes {servings} {unitWord}
            {factor !== 1 && " (quantities adjusted)"}.
          </p>

          {groups.map((g) => (
            <div key={g || "main"} className="mt-5">
              {g && <h3 className="mb-2 font-sans text-sm font-semibold tracking-wide text-olive-700 uppercase">{g}</h3>}
              <ul className="divide-y divide-sand">
                {ingredients.map((ing, i) =>
                  (ing.group ?? "") !== g ? null : (
                    <li key={i}>
                      <label className="flex min-h-12 cursor-pointer items-start gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={checked.has(i)}
                          onChange={() =>
                            setChecked((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            })
                          }
                          className="mt-1 h-5 w-5 shrink-0 accent-forest-900"
                          data-print-hide
                        />
                        <span className={checked.has(i) ? "text-ink-muted line-through" : ""}>
                          {lines[i].amount && <strong className="font-semibold">{lines[i].amount} </strong>}
                          {ing.name}
                          {ing.note && <span className="text-ink-muted">, {ing.note}</span>}
                        </span>
                      </label>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
          {system !== "original" && (
            <p className="mt-3 text-xs text-ink-muted">
              Converted amounts are rounded. Cups are US cups (237 ml).
              {anyApprox && " ≈ marks weights estimated from typical ingredient density. Weigh if precision matters."}
            </p>
          )}
        </section>

        <section aria-labelledby="method-heading">
          <h2 id="method-heading" className="text-3xl font-semibold text-forest-900">
            Method
          </h2>
          <ol className="mt-6 flex flex-col gap-8">
            {steps.map((s) => (
              <li key={s.position} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-900 font-display text-lg font-semibold text-cream"
                >
                  {s.position}
                </span>
                <div className="pt-1">
                  <h3 className="sr-only">Step {s.position}</h3>
                  <p className="text-[17px] leading-relaxed">{s.body}</p>
                  {s.timerSeconds && <StepTimer seconds={s.timerSeconds} />}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {cooking && (
        <CookingMode
          title={title}
          steps={steps}
          ingredients={ingredients.map((ing, i) => `${lines[i].amount ? `${lines[i].amount} ` : ""}${ing.name}${ing.note ? `, ${ing.note}` : ""}`)}
          onClose={() => setCooking(false)}
        />
      )}
    </>
  );
}

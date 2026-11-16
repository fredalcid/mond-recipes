"use client";

import { useActionState, useId, useMemo, useState } from "react";
import {
  saveRecipeAction,
  type EditorState,
} from "@/app/admin/recipes/actions";
import type { RecipePayload } from "@/lib/admin-schema";
import { slugify } from "@/lib/format";
import { UNITS, unitLabel } from "@/lib/units";
import { FormMessage } from "@/components/ui/Field";

type Opt = { slug: string; name: string };
export type EditorOptions = {
  countries: (Opt & { regions: Opt[] })[];
  cuisines: string[];
  categories: Opt[];
  diets: Opt[];
  allergens: Opt[];
  drinkCategories: Opt[];
  ingredientNames: string[];
};

type Ingredient = RecipePayload["ingredients"][number];
type Step = RecipePayload["steps"][number];
type Value = Omit<RecipePayload, "ingredients" | "steps" | "cuisines"> & {
  ingredients: Ingredient[];
  steps: Step[];
  cuisines: string[];
};

const input =
  "min-h-11 w-full rounded-xl border border-sand-strong bg-white px-3 text-[15px] focus:border-forest-900";
const label = "text-sm font-semibold text-ink";
const emptyIngredient = (): Ingredient => ({
  name: "",
  quantity: "",
  unit: "",
  note: "",
  group: "",
});
const emptyStep = (): Step => ({ body: "", timer_minutes: "" });

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export type EditorMode = "admin" | "member";

/**
 * Recipe form. "admin" is the full editor; "member" is the community submission form:
 * no web address, search or publishing fields, and the member chooses between
 * saving a draft and sending the recipe for review.
 */
export function RecipeEditor({
  initial,
  options,
  imageUrl,
  mode = "admin",
  saveAction = saveRecipeAction,
  ogImageUrl = null,
}: {
  initial: Value;
  options: EditorOptions;
  imageUrl: string | null;
  mode?: EditorMode;
  ogImageUrl?: string | null;
  saveAction?: (prev: EditorState, fd: FormData) => Promise<EditorState>;
}) {
  const member = mode === "member";
  const [state, action, pending] = useActionState<EditorState, FormData>(
    saveAction,
    { status: "idle" },
  );
  const [v, setV] = useState<Value>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [countryFilter, setCountryFilter] = useState("");
  const id = useId();
  const err = state.errors ?? {};
  const set = <K extends keyof Value>(k: K, val: Value[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const toggle = (
    k: "countries" | "regions" | "categories" | "diets" | "allergens",
    slug: string,
  ) =>
    setV((p) => {
      const list = (p[k] ?? []) as string[];
      return {
        ...p,
        [k]: list.includes(slug)
          ? list.filter((s) => s !== slug)
          : [...list, slug],
      };
    });

  const shownCountries = useMemo(() => {
    const q = countryFilter.trim().toLowerCase();
    const chosen = new Set(v.countries ?? []);
    return options.countries
      .filter(
        (c) => chosen.has(c.slug) || (q && c.name.toLowerCase().includes(q)),
      )
      .slice(0, 40);
  }, [countryFilter, options.countries, v.countries]);
  const regionChoices = options.countries.filter(
    (c) => (v.countries ?? []).includes(c.slug) && c.regions.length,
  );

  const errorBox = (key: string) =>
    err[key] ? (
      <p className="mt-1 text-sm font-medium text-danger">{err[key]}</p>
    ) : null;

  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="payload" value={JSON.stringify(v)} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

      <Section title="Basics">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor={`${id}-title`} className={label}>
              Title
            </label>
            <input
              id={`${id}-title`}
              className={input}
              value={v.title}
              onChange={(e) => {
                const title = e.target.value;
                setV((p) => ({
                  ...p,
                  title,
                  slug: slugTouched ? p.slug : slugify(title),
                }));
              }}
              aria-invalid={Boolean(err.title)}
            />
            {errorBox("title")}
          </div>
          <div hidden={member}>
            <label htmlFor={`${id}-slug`} className={label}>
              Web address
            </label>
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <span className="shrink-0">
                /{v.kind === "drink" ? "drinks-tea" : "recipes"}/
              </span>
              <input
                id={`${id}-slug`}
                className={input}
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase());
                }}
                aria-invalid={Boolean(err.slug)}
              />
            </div>
            {errorBox("slug")}
          </div>
          <div>
            <span className={label}>Type</span>
            <div className="mt-1 flex gap-2">
              {(["food", "drink"] as const).map((k) => (
                <label
                  key={k}
                  className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border font-semibold ${v.kind === k ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white"}`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={v.kind === k}
                    onChange={() => set("kind", k)}
                  />
                  {k === "food" ? "Food recipe" : "Drink"}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor={`${id}-summary`} className={label}>
              Short introduction
            </label>
            <textarea
              id={`${id}-summary`}
              rows={3}
              maxLength={600}
              className={`${input} py-2`}
              value={v.summary ?? ""}
              onChange={(e) => set("summary", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Photo">
        <div className="grid gap-5 md:grid-cols-[200px_1fr] md:items-start">
          <div className="aspect-4/3 overflow-hidden rounded-xl bg-sand">
            {imageUrl && !v.remove_image ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored photo
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-ink-muted">
                No photo
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-image`} className={label}>
              Upload a photo (JPEG, PNG, WebP or AVIF, up to 8 MB)
            </label>
            <input
              id={`${id}-image`}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="text-sm"
            />
            {errorBox("image")}
            <p className="text-sm text-ink-muted">
              Only use photos you took yourself or are licensed to use.
            </p>
            {imageUrl && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(v.remove_image)}
                  onChange={(e) => set("remove_image", e.target.checked)}
                  className="h-5 w-5 accent-forest-900"
                />
                Remove the current photo
              </label>
            )}
          </div>
        </div>
      </Section>

      <Section title="Details">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Prep (minutes)"
            value={v.prep_minutes}
            onChange={(x) => set("prep_minutes", x)}
            error={err.prep_minutes}
          />
          <NumberField
            label={
              v.kind === "drink" ? "Brew / cook (minutes)" : "Cook (minutes)"
            }
            value={v.cook_minutes}
            onChange={(x) => set("cook_minutes", x)}
            error={err.cook_minutes}
          />
          <NumberField
            label="Servings"
            value={v.servings}
            onChange={(x) => set("servings", x)}
            error={err.servings}
          />
          <div>
            <label htmlFor={`${id}-unit`} className={label}>
              Serving word (optional)
            </label>
            <input
              id={`${id}-unit`}
              className={input}
              placeholder="e.g. glasses"
              value={v.serving_unit ?? ""}
              onChange={(e) => set("serving_unit", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${id}-diff`} className={label}>
              Difficulty
            </label>
            <select
              id={`${id}-diff`}
              className={input}
              value={v.difficulty ?? ""}
              onChange={(e) =>
                set("difficulty", e.target.value as Value["difficulty"])
              }
            >
              <option value="">Not set</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {v.kind === "drink" && (
            <>
              <div>
                <label htmlFor={`${id}-dc`} className={label}>
                  Drink type
                </label>
                <select
                  id={`${id}-dc`}
                  className={input}
                  value={v.drink_category ?? ""}
                  onChange={(e) => set("drink_category", e.target.value)}
                >
                  <option value="">Choose…</option>
                  {options.drinkCategories.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {errorBox("drink_category")}
              </div>
              {v.drink_category === "cocktails" && (
                <NumberField
                  label="Alcohol % (ABV)"
                  value={v.alcohol_percent}
                  onChange={(x) => set("alcohol_percent", x)}
                  error={err.alcohol_percent}
                />
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Where it's from">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor={`${id}-cf`} className={label}>
              Countries (a dish can belong to several)
            </label>
            <input
              id={`${id}-cf`}
              className={input}
              placeholder="Type to find a country"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            />
            <ul className="mt-2 flex max-h-56 flex-col overflow-y-auto rounded-xl border border-sand bg-white p-1">
              {shownCountries.length === 0 && (
                <li className="p-2 text-sm text-ink-muted">
                  Type above to search all countries.
                </li>
              )}
              {shownCountries.map((c) => (
                <li key={c.slug}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-sand">
                    <input
                      type="checkbox"
                      checked={(v.countries ?? []).includes(c.slug)}
                      onChange={() => toggle("countries", c.slug)}
                      className="h-5 w-5 accent-forest-900"
                    />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
            {errorBox("countries")}
          </div>
          <div className="flex flex-col gap-5">
            {regionChoices.length > 0 && (
              <fieldset>
                <legend className={label}>
                  Regions or culinary traditions
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {regionChoices.flatMap((c) =>
                    c.regions.map((g) => (
                      <Chip
                        key={`${c.slug}-${g.slug}`}
                        checked={(v.regions ?? []).includes(g.slug)}
                        onChange={() => toggle("regions", g.slug)}
                      >
                        {g.name}{" "}
                        <span className="text-ink-muted">({c.name})</span>
                      </Chip>
                    )),
                  )}
                </div>
              </fieldset>
            )}
            <div>
              <label htmlFor={`${id}-cu`} className={label}>
                Cuisines (separate with commas)
              </label>
              <input
                id={`${id}-cu`}
                className={input}
                list={`${id}-cu-list`}
                defaultValue={v.cuisines.join(", ")}
                onChange={(e) =>
                  set(
                    "cuisines",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
              <datalist id={`${id}-cu-list`}>
                {options.cuisines.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-ink-muted">
                {member
                  ? "Choose from the suggestions, separated by commas. Our editors can add a missing cuisine when they review your recipe."
                  : `Existing: ${options.cuisines.join(", ") || "none yet"}. New cuisines are created automatically.`}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Categories, diet and allergens">
        <ChipGroup
          legend={
            v.kind === "drink" ? "Meal or dish (optional)" : "Meal or dish"
          }
          options={options.categories}
          selected={v.categories ?? []}
          onToggle={(s) => toggle("categories", s)}
        />
        <ChipGroup
          legend="Suitable for"
          options={options.diets}
          selected={v.diets ?? []}
          onToggle={(s) => toggle("diets", s)}
        />
        <ChipGroup
          legend="Contains these allergens"
          options={options.allergens}
          selected={v.allergens ?? []}
          onToggle={(s) => toggle("allergens", s)}
        />
      </Section>

      <Section title="Ingredients">
        {errorBox("ingredients")}
        <datalist id={`${id}-ing-list`}>
          {options.ingredientNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <ol className="flex flex-col gap-3">
          {v.ingredients.map((ing, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-xl border border-sand bg-white p-3 sm:grid-cols-[90px_120px_1fr_1fr_auto]"
            >
              <input
                aria-label={`Ingredient ${i + 1} quantity`}
                className={input}
                inputMode="decimal"
                placeholder="Qty"
                value={String(ing.quantity ?? "")}
                onChange={(e) =>
                  set(
                    "ingredients",
                    v.ingredients.map((x, j) =>
                      j === i ? { ...x, quantity: e.target.value } : x,
                    ),
                  )
                }
              />
              <select
                aria-label={`Ingredient ${i + 1} unit`}
                className={input}
                value={ing.unit ?? ""}
                onChange={(e) =>
                  set(
                    "ingredients",
                    v.ingredients.map((x, j) =>
                      j === i ? { ...x, unit: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">(no unit)</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {unitLabel(u, 2) || u}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Ingredient ${i + 1} name`}
                className={input}
                list={`${id}-ing-list`}
                placeholder="Ingredient"
                value={ing.name}
                onChange={(e) =>
                  set(
                    "ingredients",
                    v.ingredients.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`Ingredient ${i + 1} note`}
                className={input}
                placeholder="Note, e.g. finely chopped"
                value={ing.note ?? ""}
                onChange={(e) =>
                  set(
                    "ingredients",
                    v.ingredients.map((x, j) =>
                      j === i ? { ...x, note: e.target.value } : x,
                    ),
                  )
                }
              />
              <RowButtons
                index={i}
                count={v.ingredients.length}
                onMove={(to) => set("ingredients", move(v.ingredients, i, to))}
                onRemove={() =>
                  set(
                    "ingredients",
                    v.ingredients.filter((_, j) => j !== i),
                  )
                }
                what="ingredient"
              />
              <input
                aria-label={`Ingredient ${i + 1} group`}
                className={`${input} sm:col-span-5`}
                placeholder="Group heading (optional), e.g. For the sauce"
                value={ing.group ?? ""}
                onChange={(e) =>
                  set(
                    "ingredients",
                    v.ingredients.map((x, j) =>
                      j === i ? { ...x, group: e.target.value } : x,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() =>
            set("ingredients", [...v.ingredients, emptyIngredient()])
          }
          className="mt-3 min-h-11 self-start rounded-full border border-forest-900/30 px-5 font-semibold text-forest-900 hover:bg-forest-100"
        >
          + Add ingredient
        </button>
      </Section>

      <Section title="Method">
        {errorBox("steps")}
        <ol className="flex flex-col gap-3">
          {v.steps.map((s, i) => (
            <li
              key={i}
              className="grid gap-2 rounded-xl border border-sand bg-white p-3 sm:grid-cols-[1fr_140px_auto]"
            >
              <textarea
                aria-label={`Step ${i + 1}`}
                rows={3}
                className={`${input} py-2`}
                placeholder={`Step ${i + 1}`}
                value={s.body}
                onChange={(e) =>
                  set(
                    "steps",
                    v.steps.map((x, j) =>
                      j === i ? { ...x, body: e.target.value } : x,
                    ),
                  )
                }
              />
              <div>
                <label
                  className="text-xs font-semibold text-ink-muted"
                  htmlFor={`${id}-t-${i}`}
                >
                  Timer (minutes)
                </label>
                <input
                  id={`${id}-t-${i}`}
                  className={input}
                  inputMode="decimal"
                  value={String(s.timer_minutes ?? "")}
                  onChange={(e) =>
                    set(
                      "steps",
                      v.steps.map((x, j) =>
                        j === i ? { ...x, timer_minutes: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
              <RowButtons
                index={i}
                count={v.steps.length}
                onMove={(to) => set("steps", move(v.steps, i, to))}
                onRemove={() =>
                  set(
                    "steps",
                    v.steps.filter((_, j) => j !== i),
                  )
                }
                what="step"
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => set("steps", [...v.steps, emptyStep()])}
          className="mt-3 min-h-11 self-start rounded-full border border-forest-900/30 px-5 font-semibold text-forest-900 hover:bg-forest-100"
        >
          + Add step
        </button>
      </Section>

      <Section title="Tips and substitutions">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor={`${id}-tips`} className={label}>
              Cooking tips
            </label>
            <textarea
              id={`${id}-tips`}
              rows={4}
              className={`${input} py-2`}
              value={v.tips ?? ""}
              onChange={(e) => set("tips", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${id}-subs`} className={label}>
              Ingredient substitutions
            </label>
            <textarea
              id={`${id}-subs`}
              rows={4}
              className={`${input} py-2`}
              value={v.substitutions ?? ""}
              onChange={(e) => set("substitutions", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Source">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor={`${id}-st`} className={label}>
              Where the recipe comes from
            </label>
            <select
              id={`${id}-st`}
              className={input}
              value={v.source?.type ?? ""}
              onChange={(e) =>
                set("source", {
                  ...v.source,
                  type: e.target.value as NonNullable<Value["source"]>["type"],
                })
              }
            >
              <option value="">Not recorded</option>
              <option value="original">Original recipe</option>
              <option value="family">Family recipe</option>
              <option value="adapted">Adapted (with credit)</option>
              {!member && <option value="licensed">Licensed</option>}
              {!member && (
                <option value="test_kitchen">
                  Developed in our test kitchen
                </option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-sd`} className={label}>
              Details / credit
            </label>
            <input
              id={`${id}-sd`}
              className={input}
              value={v.source?.description ?? ""}
              onChange={(e) =>
                set("source", { ...v.source, description: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor={`${id}-su`} className={label}>
              Link (optional)
            </label>
            <input
              id={`${id}-su`}
              className={input}
              type="url"
              value={v.source?.url ?? ""}
              onChange={(e) =>
                set("source", { ...v.source, url: e.target.value })
              }
            />
          </div>
        </div>
        {errorBox("source")}
        <p className="text-sm text-ink-muted">
          Never copy recipes, text or photos from other websites or books.
        </p>
      </Section>

      {!member && (
        <Section title="Search engines">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor={`${id}-seo`} className={label}>
                SEO title (optional, up to 70 characters)
              </label>
              <input
                id={`${id}-seo`}
                maxLength={70}
                className={input}
                value={v.seo_title ?? ""}
                onChange={(e) => set("seo_title", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${id}-meta`} className={label}>
                Meta description (optional, up to 300 characters)
              </label>
              <textarea
                id={`${id}-meta`}
                rows={2}
                maxLength={300}
                className={`${input} py-2`}
                value={v.meta_description ?? ""}
                onChange={(e) => set("meta_description", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${id}-canonical`} className={label}>
                Canonical address (optional)
              </label>
              <input
                id={`${id}-canonical`}
                type="url"
                className={input}
                value={v.canonical_url ?? ""}
                onChange={(e) => set("canonical_url", e.target.value)}
                placeholder="https://…"
              />
              <p className="mt-1 text-xs text-ink-muted">Only if this recipe was first published at another address. Usually leave empty.</p>
              {errorBox("canonical_url")}
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={Boolean(v.noindex)} onChange={(e) => set("noindex", e.target.checked)} className="mt-0.5 h-5 w-5 accent-forest-900" />
                <span>
                  <strong>Hide from search engines</strong>. The page stays visible on the site.
                </span>
              </label>
              <div>
                <label htmlFor={`${id}-og`} className={label}>
                  Social sharing image (optional)
                </label>
                <input id={`${id}-og`} name="og_image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
                <p className="mt-1 text-xs text-ink-muted">1200 × 630 pixels works best. If empty, the main photo is used.</p>
                {ogImageUrl && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(v.remove_og_image)} onChange={(e) => set("remove_og_image", e.target.checked)} className="h-5 w-5 accent-forest-900" />
                    Remove the current sharing image
                  </label>
                )}
                {errorBox("og_image")}
              </div>
            </div>
          </div>
        </Section>
      )}

      {!member && (
        <Section title="Publishing">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor={`${id}-status`} className={label}>
                Status
              </label>
              <select
                id={`${id}-status`}
                className={input}
                value={v.status}
                onChange={(e) =>
                  set("status", e.target.value as Value["status"])
                }
              >
                <option value="draft">Draft (only staff can see it)</option>
                <option value="pending">Waiting for review</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-ver`} className={label}>
                Review level
              </label>
              <select
                id={`${id}-ver`}
                className={input}
                value={v.verification}
                onChange={(e) =>
                  set("verification", e.target.value as Value["verification"])
                }
              >
                <option value="community">Community recipe (no badge)</option>
                <option value="editorial">Editorially reviewed</option>
                <option value="test_kitchen">Test-kitchen verified</option>
              </select>
              {v.verification === "test_kitchen" && (
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(v.verificationConfirmed)}
                    onChange={(e) =>
                      set("verificationConfirmed", e.target.checked)
                    }
                    className="mt-0.5 h-5 w-5 accent-forest-900"
                  />
                  I confirm this recipe was cooked and passed our test-kitchen
                  review.
                </label>
              )}
              {errorBox("verification")}
            </div>
          </div>
        </Section>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t border-sand-strong bg-ivory/95 px-4 py-4">
        {state.status === "error" && (
          <p className="mr-auto text-sm font-medium text-danger">
            Not saved. Check the messages above.
          </p>
        )}
        {member ? (
          <>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="min-h-12 rounded-full border border-forest-900 bg-white px-6 font-semibold text-forest-900 hover:bg-sand disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="submit"
              name="intent"
              value="pending"
              disabled={pending}
              className="min-h-12 rounded-full bg-forest-900 px-6 font-semibold text-cream hover:bg-forest-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Send for review"}
            </button>
          </>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 rounded-full bg-forest-900 px-8 font-semibold text-cream hover:bg-forest-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save recipe"}
          </button>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-sand-strong bg-white/60 p-5 sm:p-6">
      <h2 className="text-2xl font-semibold text-forest-900">{title}</h2>
      {children}
    </section>
  );
}

function NumberField({
  label: text,
  value,
  onChange,
  error,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <input
        id={id}
        className={input}
        inputMode="numeric"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

function Chip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium has-focus-visible:outline-3 has-focus-visible:outline-gold-600 ${checked ? "border-forest-900 bg-forest-900 text-cream" : "border-sand-strong bg-white"}`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}

function ChipGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Opt[];
  selected: string[];
  onToggle: (s: string) => void;
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip
            key={o.slug}
            checked={selected.includes(o.slug)}
            onChange={() => onToggle(o.slug)}
          >
            {o.name}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function RowButtons({
  index,
  count,
  onMove,
  onRemove,
  what,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  what: string;
}) {
  const b =
    "h-11 w-11 rounded-full border border-sand-strong text-forest-900 hover:bg-sand disabled:opacity-30";
  return (
    <div className="flex items-start gap-1">
      <button
        type="button"
        className={b}
        onClick={() => onMove(index - 1)}
        disabled={index === 0}
        aria-label={`Move ${what} ${index + 1} up`}
      >
        ↑
      </button>
      <button
        type="button"
        className={b}
        onClick={() => onMove(index + 1)}
        disabled={index === count - 1}
        aria-label={`Move ${what} ${index + 1} down`}
      >
        ↓
      </button>
      <button
        type="button"
        className={`${b} text-danger`}
        onClick={onRemove}
        aria-label={`Remove ${what} ${index + 1}`}
      >
        ×
      </button>
    </div>
  );
}

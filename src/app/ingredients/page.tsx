import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import { SampleNotice } from "@/components/ui/SampleNotice";
import { IngredientPicker } from "@/components/search/IngredientPicker";
import { getData, recipeHref, type IngredientMatch } from "@/lib/data";
import { formatMinutes } from "@/lib/format";

export const metadata: Metadata = {
  title: "Cook with what you have",
  description: "Pick the ingredients you already have and find recipes that use them.",
  alternates: { canonical: "/ingredients" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IngredientsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.i) ? sp.i : sp.i ? [sp.i] : [];
  const data = getData();
  const options = await data.listIngredients();
  const bySlug = new Map(options.map((o) => [o.slug, o]));
  const selected = [...new Set(raw)].filter((s) => bySlug.has(s)).slice(0, 30);
  const matches: IngredientMatch[] = selected.length ? await data.matchByIngredients(selected.map((s) => bySlug.get(s)!.id)) : [];

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Recipes", href: "/recipes" }, { label: "Cook with what you have" }]} />
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-olive-700 uppercase">Ingredient finder</p>
        <h1 className="mt-2 text-4xl font-semibold text-forest-900 sm:text-5xl">Cook with what you have</h1>
        <p className="mt-3 text-lg text-ink-muted">
          Choose the ingredients in your kitchen. We&apos;ll show the recipes that use the most of them, and what else you&apos;d need.
        </p>
      </header>
      {data.mode === "sample" && (
        <div className="mt-6">
          <SampleNotice />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
        <IngredientPicker options={options} selected={selected} />
        <section aria-labelledby="matches-heading" aria-live="polite">
          <h2 id="matches-heading" className="mb-5 font-sans text-base font-semibold text-ink">
            {selected.length === 0
              ? "Recipes will appear here"
              : matches.length === 0
                ? "No recipes use these ingredients yet"
                : `${matches.length} recipe${matches.length === 1 ? "" : "s"}, best match first`}
          </h2>
          {selected.length === 0 && (
            <p className="rounded-card border border-dashed border-sand-strong bg-white/70 p-8 text-ink-muted">
              Add one or more ingredients to get started. Basics like salt and water are best left out.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {matches.map((m) => (
              <li key={m.recipe.id}>
                <article className="relative flex gap-4 overflow-hidden rounded-card bg-white p-3 shadow-card sm:gap-5">
                  <RecipeImage src={m.recipe.imageUrl} alt="" seed={m.recipe.slug} className="h-28 w-28 shrink-0 rounded-xl sm:h-32 sm:w-40" sizes="160px" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.recipe.isSample && <SampleBadge />}
                      <span className="text-xs font-semibold tracking-[0.12em] text-olive-700 uppercase">{m.recipe.cuisines.join(" · ")}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-forest-900">
                      <Link href={recipeHref(m.recipe)} className="after:absolute after:inset-0">
                        {m.recipe.title}
                      </Link>
                    </h3>
                    <p className="text-sm font-semibold text-success">
                      Uses {m.matched} of your ingredients · {formatMinutes(m.recipe.totalMinutes)}
                    </p>
                    <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-sand" aria-hidden="true">
                      <div className="h-full rounded-full bg-olive-500" style={{ width: `${Math.round((m.matched / m.total) * 100)}%` }} />
                    </div>
                    <p className="text-sm text-ink-muted">
                      {m.missing.length === 0 ? (
                        <strong className="text-forest-900">You have everything!</strong>
                      ) : (
                        <>
                          <span className="font-semibold text-ink">You&apos;d also need: </span>
                          {m.missing.join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}

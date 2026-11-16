import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/ui/JsonLd";
import { RecipeGrid } from "@/components/cards/RecipeCard";
import { CountryFlag } from "@/components/cards/CountryCard";
import { VerificationBadge } from "./VerificationBadge";
import { RecipeActions } from "./RecipeActions";
import { RecipeInteractive } from "./RecipeInteractive";
import { AdSlot } from "@/components/ads/AdSlot";
import { formatMinutes, formatRating } from "@/lib/format";
import { recipeHref, type RecipeDetail, type RecipeSummary } from "@/lib/data/types";
import { site } from "@/lib/site";

const LEVEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;
const iso = (m: number | null) => (m ? `PT${Math.floor(m / 60) ? `${Math.floor(m / 60)}H` : ""}${m % 60 ? `${m % 60}M` : ""}` : undefined);

export function RecipeView({ recipe, related, crumbs }: { recipe: RecipeDetail; related: RecipeSummary[]; crumbs: Crumb[] }) {
  const isDrink = recipe.kind === "drink";
  return (
    <article>
      <Container className="pt-8 sm:pt-12">
        <Breadcrumbs items={crumbs} />

        <header className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {recipe.isSample && <SampleBadge />}
              <VerificationBadge level={recipe.verification} />
              {recipe.drinkCategory && (
                <Link
                  href={`/drinks-tea?type=${recipe.drinkCategory.slug}`}
                  className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-900 hover:underline"
                >
                  {recipe.drinkCategory.name}
                </Link>
              )}
            </div>
            <h1 className="text-4xl leading-tight font-semibold text-forest-900 sm:text-5xl lg:text-6xl">{recipe.title}</h1>
            {recipe.summary && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{recipe.summary}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {recipe.countryLinks.map((c) => (
                <Link key={c.slug} href={`/countries/${c.slug}`} className="inline-flex min-h-8 items-center gap-2 font-semibold text-forest-900 hover:underline">
                  <CountryFlag iso2={c.iso2} name={c.name} className="h-4 w-6" />
                  {c.name}
                </Link>
              ))}
              {recipe.regions.map((g) => (
                <Link key={g.slug} href={`/countries/${g.countrySlug}/${g.slug}`} className="font-medium text-ink-muted hover:text-forest-900 hover:underline">
                  {g.name}
                </Link>
              ))}
              {recipe.cuisineLinks.map((c) => (
                <Link
                  key={c.slug}
                  href={`${isDrink ? "/drinks-tea" : "/recipes"}?cuisine=${c.slug}`}
                  className="font-medium text-ink-muted hover:text-forest-900 hover:underline"
                >
                  {c.name} cuisine
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              {recipe.isSample ? "Sample recipe for design review" : recipe.author ? `Recipe by ${recipe.author.displayName}` : "From the Mònd Recipes kitchen"}
              <span aria-hidden="true"> · </span>
              <span aria-hidden="true" className="text-gold-600">
                ★{" "}
              </span>
              {formatRating(recipe.ratingAverage, recipe.ratingCount)}
            </p>
            <div className="mt-6">
              <RecipeActions recipeId={recipe.id} title={recipe.title} />
            </div>
          </div>
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            seed={recipe.slug}
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="aspect-4/3 rounded-[1.5rem]"
          />
        </header>

        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-sand-strong bg-sand-strong sm:grid-cols-5">
          {[
            ["Prep", formatMinutes(recipe.prepMinutes)],
            [isDrink ? "Brew / cook" : "Cook", recipe.cookMinutes ? formatMinutes(recipe.cookMinutes) : "None"],
            ["Total", formatMinutes(recipe.totalMinutes)],
            ["Serves", recipe.servings ? `${recipe.servings}${recipe.servingUnit ? ` ${recipe.servingUnit}` : ""}` : "—"],
            ["Difficulty", recipe.difficulty ? LEVEL[recipe.difficulty] : "—"],
          ].map(([k, v], i) => (
            <div key={k} className={`bg-white px-5 py-4 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{k}</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-forest-900">{v}</dd>
            </div>
          ))}
        </dl>

        {(recipe.diets.length > 0 || recipe.allergens.length > 0) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {recipe.diets.length > 0 && (
              <div>
                <h2 className="font-sans text-sm font-semibold text-ink">Dietary information</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {recipe.diets.map((d) => (
                    <li key={d.slug}>
                      <Link href={`${isDrink ? "/drinks-tea" : "/recipes"}?diet=${d.slug}`} className="inline-flex min-h-8 items-center rounded-full bg-forest-100 px-3 text-sm font-medium text-forest-900 hover:underline">
                        {d.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h2 className="font-sans text-sm font-semibold text-ink">Allergens</h2>
              {recipe.allergens.length > 0 ? (
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-danger">Contains: </span>
                  {recipe.allergens.map((a) => a.name).join(", ")}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">No priority allergens listed.</p>
              )}
              <p className="mt-1 text-xs text-ink-muted">Always check ingredient labels: brands vary.</p>
            </div>
          </div>
        )}
        {recipe.alcoholPercent != null && (
          <p className="mt-6 rounded-xl bg-sand px-4 py-3 text-sm">
            Contains alcohol (about {recipe.alcoholPercent}% ABV). Please enjoy responsibly and only if you are of legal drinking age.
          </p>
        )}

        <AdSlot id="recipe_top" />

        <div className="mt-10">
          <RecipeInteractive
            title={recipe.title}
            baseServings={recipe.servings}
            servingUnit={recipe.servingUnit}
            ingredients={recipe.ingredients}
            steps={recipe.steps}
          />
        </div>

        {(recipe.tips || recipe.substitutions) && (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {recipe.tips && (
              <section className="rounded-card bg-forest-100 p-6">
                <h2 className="text-2xl font-semibold text-forest-900">Cooking tips</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line">{recipe.tips}</p>
              </section>
            )}
            {recipe.substitutions && (
              <section className="rounded-card bg-sand p-6">
                <h2 className="text-2xl font-semibold text-forest-900">Substitutions</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line">{recipe.substitutions}</p>
              </section>
            )}
          </div>
        )}

        <AdSlot id="recipe_bottom" />

        <div className="mt-12 grid gap-6 md:grid-cols-2" data-print-hide>
          <section className="rounded-card border border-sand-strong bg-white p-6">
            <h2 className="text-2xl font-semibold text-forest-900">Nutrition</h2>
            <p className="mt-2 text-ink-muted">Nutrition information isn&apos;t available for this recipe yet.</p>
          </section>
          <section className="rounded-card border border-sand-strong bg-white p-6">
            <h2 className="text-2xl font-semibold text-forest-900">Ratings &amp; reviews</h2>
            <p className="mt-2 text-ink-muted">
              {recipe.ratingCount > 0
                ? formatRating(recipe.ratingAverage, recipe.ratingCount)
                : "No ratings yet."}{" "}
              Reviews and cooking photos from members open with the community.
            </p>
          </section>
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16 bg-sand/60 py-14" data-print-hide>
          <Container>
            <h2 id="related-heading" className="mb-8 text-3xl font-semibold text-forest-900">
              You might also like
            </h2>
            <RecipeGrid recipes={related} />
          </Container>
        </section>
      )}

      {!recipe.isSample && <JsonLd data={recipeJsonLd(recipe)} />}
    </article>
  );
}

/** Recipe structured data built only from what is shown on the page. Ratings appear only when real ratings exist. */
function recipeJsonLd(r: RecipeDetail): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.metaDescription ?? r.summary ?? undefined,
    image: r.imageUrl ? [r.imageUrl] : undefined,
    author: { "@type": r.author ? "Person" : "Organization", name: r.author?.displayName ?? site.name },
    datePublished: r.publishedAt ?? undefined,
    dateModified: r.updatedAt ?? undefined,
    prepTime: iso(r.prepMinutes),
    cookTime: iso(r.cookMinutes),
    totalTime: iso(r.totalMinutes),
    recipeYield: r.servings ? `${r.servings}${r.servingUnit ? ` ${r.servingUnit}` : ""}` : undefined,
    recipeCategory: r.kind === "drink" ? (r.drinkCategory?.name ?? "Drink") : r.categories[0]?.name,
    recipeCuisine: r.cuisineLinks.map((c) => c.name).join(", ") || undefined,
    suitableForDiet: r.diets.some((d) => d.slug === "vegan")
      ? "https://schema.org/VeganDiet"
      : r.diets.some((d) => d.slug === "vegetarian")
        ? "https://schema.org/VegetarianDiet"
        : undefined,
    recipeIngredient: r.ingredients.map((i) =>
      [i.quantity ?? "", i.unit && !["piece", "leaf"].includes(i.unit) ? i.unit.replace("_", " ") : "", i.name, i.note ? `(${i.note})` : ""]
        .filter(Boolean)
        .join(" "),
    ),
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", position: s.position, text: s.body })),
    url: new URL(recipeHref(r), site.url).toString(),
    ...(r.ratingCount > 0 && r.ratingAverage != null
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: r.ratingAverage, ratingCount: r.ratingCount } }
      : {}),
  };
}

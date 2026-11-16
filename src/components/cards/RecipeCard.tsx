import Link from "next/link";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import { VerificationBadge } from "@/components/recipe/VerificationBadge";
import { formatMinutes, formatRating } from "@/lib/format";
import { recipeHref, type RecipeSummary } from "@/lib/data/types";

const LEVEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

export function RecipeCard({ recipe, tone = "light" }: { recipe: RecipeSummary; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const origin = recipe.countries.map((c) => c.name).join(" · ") || recipe.cuisines.join(" · ");
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-card transition-shadow duration-300 ${
        dark ? "bg-forest-800 text-cream" : "bg-white shadow-card hover:shadow-lg"
      }`}
    >
      <div className="relative overflow-hidden">
        <RecipeImage
          src={recipe.imageUrl}
          alt={recipe.title}
          seed={recipe.slug}
          className="aspect-4/3 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 flex gap-2">
          {recipe.isSample && <SampleBadge />}
          <VerificationBadge level={recipe.verification} compact />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {origin && (
          <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${dark ? "text-gold-500" : "text-olive-700"}`}>{origin}</p>
        )}
        <h3 className={`text-xl leading-snug font-semibold ${dark ? "" : "text-forest-900"}`}>
          <Link href={recipeHref(recipe)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {recipe.title}
          </Link>
        </h3>
        <dl className={`mt-auto grid grid-cols-3 gap-2 border-t pt-3 text-sm ${dark ? "border-forest-700" : "border-sand"}`}>
          <div>
            <dt className={`text-xs ${dark ? "text-cream/70" : "text-ink-muted"}`}>Prep</dt>
            <dd className="font-medium">{formatMinutes(recipe.prepMinutes)}</dd>
          </div>
          <div>
            <dt className={`text-xs ${dark ? "text-cream/70" : "text-ink-muted"}`}>Cook</dt>
            <dd className="font-medium">{recipe.cookMinutes ? formatMinutes(recipe.cookMinutes) : "None"}</dd>
          </div>
          <div>
            <dt className={`text-xs ${dark ? "text-cream/70" : "text-ink-muted"}`}>Level</dt>
            <dd className="font-medium">{recipe.difficulty ? LEVEL[recipe.difficulty] : "—"}</dd>
          </div>
        </dl>
        <p className={`text-sm ${dark ? "text-cream/75" : "text-ink-muted"}`}>
          <span aria-hidden="true" className="mr-1 text-gold-600">
            ★
          </span>
          {formatRating(recipe.ratingAverage, recipe.ratingCount)}
        </p>
      </div>
    </article>
  );
}

export function RecipeGrid({ recipes, columns = 4, tone }: { recipes: RecipeSummary[]; columns?: 3 | 4; tone?: "light" | "dark" }) {
  return (
    <ul className={`grid gap-6 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {recipes.map((r) => (
        <li key={r.id}>
          <RecipeCard recipe={r} tone={tone} />
        </li>
      ))}
    </ul>
  );
}

import { PhotoPlaceholder, type PhotoTone } from "@/components/ui/PhotoPlaceholder";
import { SampleBadge } from "@/components/ui/Badge";
import { formatMinutes, formatRating } from "@/lib/format";

export type RecipeCardData = {
  title: string;
  cuisine: string;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: string;
  averageRating?: number | null;
  ratingCount?: number | null;
  tone?: PhotoTone;
  sample?: boolean;
};

/**
 * Recipe card. In Phase 2 the title links to the recipe page and the Save
 * button stores the recipe for signed-in members. Sample cards show no
 * save button, so nothing on the page pretends to work.
 */
export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition-shadow duration-300 hover:shadow-lg">
      <div className="relative">
        <PhotoPlaceholder tone={recipe.tone} className="aspect-4/3 transition-transform duration-500 group-hover:scale-[1.02]" />
        {recipe.sample && (
          <span className="absolute top-3 left-3">
            <SampleBadge />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-olive-700 uppercase">{recipe.cuisine}</p>
        <h3 className="text-xl leading-snug font-semibold text-forest-900">{recipe.title}</h3>
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-sand pt-3 text-sm">
          <div>
            <dt className="text-xs text-ink-muted">Prep</dt>
            <dd className="font-medium">{formatMinutes(recipe.prepMinutes)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Cook</dt>
            <dd className="font-medium">{formatMinutes(recipe.cookMinutes)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Level</dt>
            <dd className="font-medium">{recipe.difficulty}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-muted">
          <span aria-hidden="true" className="mr-1 text-gold-600">
            ★
          </span>
          {formatRating(recipe.averageRating, recipe.ratingCount)}
        </p>
      </div>
    </article>
  );
}

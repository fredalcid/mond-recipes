import Link from "next/link";
import * as Flags from "country-flag-icons/react/3x2";
import { RecipeImage } from "@/components/ui/RecipeImage";
import { SampleBadge } from "@/components/ui/Badge";
import type { CountrySummary } from "@/lib/data/types";

type FlagComponent = (props: { title?: string; className?: string }) => React.JSX.Element;

export function CountryFlag({ iso2, name, className = "h-5 w-7.5", src }: { iso2: string; name: string; className?: string; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- small flag uploaded by editors
    return <img src={src} alt={`Flag of ${name}`} className={`${className} shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]`} />;
  }
  const Flag = (Flags as unknown as Record<string, FlagComponent | undefined>)[iso2.toUpperCase()];
  if (!Flag) return null;
  return <Flag title={`Flag of ${name}`} className={`${className} shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]`} />;
}

export function CountryCard({ country, sample = false }: { country: CountrySummary; sample?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card transition-shadow hover:shadow-lg">
      <div className="relative">
        <RecipeImage src={country.imageUrl} alt="" seed={country.slug} className="aspect-16/10" />
        {sample && (
          <span className="absolute top-3 left-3">
            <SampleBadge />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <CountryFlag iso2={country.iso2} name={country.name} src={country.flagUrl} />
          <h3 className="text-xl font-semibold text-forest-900">
            <Link href={`/countries/${country.slug}`} className="after:absolute after:inset-0">
              {country.name}
            </Link>
          </h3>
        </div>
        {country.intro && <p className="text-sm leading-relaxed text-ink-muted">{country.intro}</p>}
        <p className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-forest-900">
          <span>
            {country.recipeCount} recipe{country.recipeCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            Explore →
          </span>
        </p>
      </div>
    </article>
  );
}

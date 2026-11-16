import * as Flags from "country-flag-icons/react/3x2";
import { PhotoPlaceholder, type PhotoTone } from "@/components/ui/PhotoPlaceholder";
import { SampleBadge } from "@/components/ui/Badge";

type FlagComponent = (props: { title?: string; className?: string }) => React.JSX.Element;

export function CountryFlag({ iso2, name, className = "h-5 w-7.5" }: { iso2: string; name: string; className?: string }) {
  const Flag = (Flags as unknown as Record<string, FlagComponent | undefined>)[iso2.toUpperCase()];
  if (!Flag) return null;
  return <Flag title={`Flag of ${name}`} className={`${className} rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]`} />;
}

export type CountryCardData = { iso2: string; name: string; intro: string; tone?: PhotoTone; sample?: boolean };

export function CountryCard({ country }: { country: CountryCardData }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="relative">
        <PhotoPlaceholder tone={country.tone} className="aspect-16/10" />
        {country.sample && (
          <span className="absolute top-3 left-3">
            <SampleBadge />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <CountryFlag iso2={country.iso2} name={country.name} />
          <h3 className="text-xl font-semibold text-forest-900">{country.name}</h3>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">{country.intro}</p>
        <p className="mt-auto pt-2 text-sm font-semibold text-forest-900">
          Country pages open in Phase 2
        </p>
      </div>
    </article>
  );
}

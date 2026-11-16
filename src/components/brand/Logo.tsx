import Image from "next/image";
import Link from "next/link";

/** The Mònd Recipes badge with the wordmark beside it. */
export function Logo({
  size = 48,
  showWordmark = true,
  tone = "dark",
  name = "Mònd Recipes",
  logoUrl = null,
}: {
  size?: number;
  showWordmark?: boolean;
  tone?: "dark" | "light";
  name?: string;
  /** Logo uploaded in Admin → Settings; the built-in badge is used otherwise. */
  logoUrl?: string | null;
}) {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-3" aria-label={`${name} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded logo from Storage
        <img src={logoUrl} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
      ) : (
        <Image src="/brand/mond-badge.png" alt="" width={size} height={size} priority className="shrink-0" />
      )}
      {showWordmark && (
        <span className={`font-display text-xl leading-none font-semibold tracking-tight sm:text-2xl ${tone === "dark" ? "text-forest-900" : "text-cream"}`}>
          {name}
        </span>
      )}
    </Link>
  );
}

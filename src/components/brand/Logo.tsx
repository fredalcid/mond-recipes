import Image from "next/image";
import Link from "next/link";

/** The Mònd Recipes badge with the wordmark beside it. */
export function Logo({ size = 48, showWordmark = true, tone = "dark" }: { size?: number; showWordmark?: boolean; tone?: "dark" | "light" }) {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-3" aria-label="Mònd Recipes home">
      <Image src="/brand/mond-badge.png" alt="" width={size} height={size} priority className="shrink-0" />
      {showWordmark && (
        <span className={`font-display text-xl leading-none font-semibold tracking-tight sm:text-2xl ${tone === "dark" ? "text-forest-900" : "text-cream"}`}>
          Mònd Recipes
        </span>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/components/privacy/ConsentManager";
import type { AdPlacement } from "@/lib/content/types";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

/** Pages without publisher content (sign-in, account, admin, forms, legal): never show ads there (AdSense policy). */
const NO_ADS = /^\/(admin|account|auth|sign-in|join|reset-password|update-password|notifications|submit|community\/new|privacy|terms|cookies)(\/|$)/;
export const adsAllowedOn = (path: string) => !NO_ADS.test(path);

/**
 * One advertising placement. Shows a Google AdSense unit only when the
 * placement is switched on, AdSense is configured and the visitor allowed
 * advertising cookies. Otherwise shows the placement's fallback (or nothing).
 * Ads are always labelled and kept apart from buttons and links to avoid
 * accidental clicks.
 */
export function AdUnit({ placement }: { placement: AdPlacement | undefined }) {
  const consent = useConsent();
  const ref = useRef<HTMLModElement>(null);
  const allowedHere = adsAllowedOn(usePathname() ?? "/");
  const showAd = Boolean(allowedHere && placement?.isEnabled && placement.adsenseSlot && ADSENSE_CLIENT && consent?.ads);

  useEffect(() => {
    if (!showAd || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* ad blocked or script not ready */
    }
  }, [showAd]);

  if (!placement || !allowedHere) return null;

  if (showAd) {
    return (
      <aside aria-label="Advertisement" className="my-10" data-print-hide>
        <p className="mb-1 text-center text-[11px] tracking-[0.18em] text-ink-muted uppercase">Advertisement</p>
        <ins
          ref={ref}
          className="adsbygoogle block min-h-[100px] overflow-hidden"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={placement.adsenseSlot ?? undefined}
          data-ad-format={placement.format === "fluid" ? "fluid" : placement.format === "auto" ? "auto" : placement.format}
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  if (placement.isEnabled && placement.fallback === "house" && placement.houseText && placement.houseUrl) {
    return (
      <aside aria-label="From Mònd Recipes" className="my-10 rounded-card bg-forest-100 p-5 text-center" data-print-hide>
        <Link href={placement.houseUrl} className="font-semibold text-forest-900 underline underline-offset-4">
          {placement.houseText}
        </Link>
      </aside>
    );
  }

  if (placement.isEnabled && placement.fallback === "newsletter") {
    return (
      <aside aria-label="Newsletter" className="my-10 rounded-card bg-forest-100 p-5 text-center" data-print-hide>
        <p className="font-semibold text-forest-900">
          Enjoying this?{" "}
          <Link href="/#newsletter-title" className="underline underline-offset-4">
            Get 5 easy recipes in your inbox each week
          </Link>
        </p>
      </aside>
    );
  }

  return null;
}

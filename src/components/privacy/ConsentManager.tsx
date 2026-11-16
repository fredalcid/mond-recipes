"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, OPEN_SETTINGS_EVENT, readConsent, writeConsent, type Consent } from "@/lib/consent";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** Hook for components that depend on the visitor's choices. */
export function useConsent(): Consent | null {
  const [c, setC] = useState<Consent | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setC(readConsent()), 0);
    const on = (e: Event) => setC((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, on);
    return () => {
      clearTimeout(t);
      window.removeEventListener(CONSENT_EVENT, on);
    };
  }, []);
  return c;
}

/**
 * Cookie banner + loader for ad and analytics scripts. Nothing optional loads
 * until the visitor chooses. Google Consent Mode defaults to "denied".
 * Note: for visitors in the EU/UK, Google requires a certified consent platform;
 * swap this banner for one before serving ads there.
 */
export function ConsentManager() {
  const consent = useConsent();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [ads, setAds] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const needsChoice = Boolean(ADSENSE_CLIENT || GA_ID);

  useEffect(() => {
    const t = setTimeout(() => {
      if (needsChoice && !readConsent()) setOpen(true);
    }, 0);
    const reopen = () => {
      const c = readConsent();
      setAds(c?.ads ?? false);
      setAnalytics(c?.analytics ?? false);
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => {
      clearTimeout(t);
      window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
    };
  }, [needsChoice]);

  useEffect(() => {
    if (!consent) return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("consent", "update", {
      ad_storage: consent.ads ? "granted" : "denied",
      ad_user_data: consent.ads ? "granted" : "denied",
      ad_personalization: consent.ads ? "granted" : "denied",
      analytics_storage: consent.analytics ? "granted" : "denied",
    });
  }, [consent]);

  const save = (choice: { ads: boolean; analytics: boolean }) => {
    writeConsent(choice);
    setOpen(false);
    setDetails(false);
  };

  return (
    <>
      {(GA_ID || ADSENSE_CLIENT) && (
        <Script id="consent-default" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});`}
        </Script>
      )}
      {GA_ID && consent?.analytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-config" strategy="afterInteractive">{`gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {ADSENSE_CLIENT && consent?.ads && (
        <Script
          id="adsense"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}

      {open && (
        <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-sand-strong bg-white p-5 shadow-2xl sm:p-6" data-print-hide>
          <h2 id="consent-title" className="font-sans text-lg font-semibold text-forest-900">
            Your privacy choices
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            We use essential cookies to run the site and keep you signed in. With your permission, we&apos;d also like to use cookies for
            advertising and to understand how the site is used. You can change your mind at any time from “Cookie settings” in the footer.{" "}
            <Link href="/cookies" className="font-semibold text-forest-900 underline">
              Cookie policy
            </Link>
          </p>
          {details && (
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked disabled className="mt-0.5 h-5 w-5" />
                <span>
                  <strong>Essential</strong>: needed for sign-in and security. Always on.
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 h-5 w-5 accent-forest-900" />
                <span>
                  <strong>Analytics</strong>: helps us see which pages and recipes are useful (Google Analytics).
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} className="mt-0.5 h-5 w-5 accent-forest-900" />
                <span>
                  <strong>Advertising</strong>: lets Google show ads that keep Mònd Recipes free.
                </span>
              </label>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {details ? (
              <button type="button" onClick={() => save({ ads, analytics })} className="min-h-11 rounded-full bg-forest-900 px-5 text-sm font-semibold text-cream">
                Save my choices
              </button>
            ) : (
              <button type="button" onClick={() => setDetails(true)} className="min-h-11 rounded-full border border-sand-strong px-5 text-sm font-semibold text-forest-900">
                Choose
              </button>
            )}
            <button type="button" onClick={() => save({ ads: false, analytics: false })} className="min-h-11 rounded-full border border-sand-strong px-5 text-sm font-semibold text-forest-900">
              Reject optional
            </button>
            <button type="button" onClick={() => save({ ads: true, analytics: true })} className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-semibold text-forest-950">
              Accept all
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieSettingsButton({ className = "" }: { className?: string }) {
  // Nothing to choose until ads or analytics are set up.
  if (!process.env.NEXT_PUBLIC_GA_ID && !process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}

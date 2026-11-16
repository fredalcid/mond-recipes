/**
 * Visitor privacy choices. Stored in a first-party cookie so the server can
 * respect it too. Ads and analytics stay off until the visitor opts in, which
 * matches Quebec's Law 25 approach of consent before tracking.
 */
export type Consent = { v: 1; ads: boolean; analytics: boolean; ts: number };

export const CONSENT_COOKIE = "mond_consent";
export const CONSENT_EVENT = "mond:consent-changed";
export const OPEN_SETTINGS_EVENT = "mond:open-consent";
const MAX_AGE_DAYS = 365;

export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (v && v.v === 1 && typeof v.ads === "boolean" && typeof v.analytics === "boolean") return v as Consent;
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return parseConsent(m?.[1]);
}

export function writeConsent(choice: { ads: boolean; analytics: boolean }) {
  const value: Consent = { v: 1, ...choice, ts: Date.now() };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

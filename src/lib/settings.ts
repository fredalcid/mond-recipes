import "server-only";
import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/data/supabase-source";
import { isSupabaseConfigured } from "@/lib/env";
import { site } from "@/lib/site";
import { storageUrl } from "@/lib/community/types";

export const SOCIAL_NETWORKS = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["pinterest", "Pinterest"],
  ["x", "X"],
] as const;

export const HOMEPAGE_SECTIONS = [
  ["countries", "Discover by country"],
  ["popular", "Popular recipes"],
  ["trending", "Trending recipes"],
  ["drinks", "Drinks & tea"],
  ["categories", "Explore by category"],
  ["community", "Community"],
  ["articles", "Articles & videos"],
  ["shop", "Shop highlights"],
  ["newsletter", "Newsletter"],
] as const;

export type HomepageSection = (typeof HOMEPAGE_SECTIONS)[number][0];

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  contactEmail: string | null;
  mailingAddress: string | null;
  social: { label: string; href: string }[];
  footerNote: string;
  sections: Record<HomepageSection, boolean>;
  newsletterIntro: string;
  seo: { defaultTitle: string; defaultDescription: string; ogImageUrl: string | null; allowIndexing: boolean };
  adsTxt: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  name: site.name,
  tagline: site.tagline,
  description: site.description,
  logoUrl: null,
  contactEmail: null,
  mailingAddress: null,
  social: [],
  footerNote: "Recipes and photos on this site are original or used with permission.",
  sections: Object.fromEntries(HOMEPAGE_SECTIONS.map(([k]) => [k, true])) as Record<HomepageSection, boolean>,
  newsletterIntro: "New recipes, country guides and cooking tips. No spam, and you can unsubscribe at any time.",
  // Without a database (the sample preview) the site is never indexed.
  seo: { defaultTitle: "Mònd Recipes — Discover the World, One Recipe at a Time", defaultDescription: site.description, ogImageUrl: null, allowIndexing: false },
  adsTxt: "",
};

const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Turns stored rows into settings, ignoring anything malformed. */
export function parseSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const d = DEFAULT_SETTINGS;
  const socialRaw = m.get("social.links");
  const social = Array.isArray(socialRaw)
    ? socialRaw
        .filter((x): x is { network: string; url: string } => Boolean(x) && typeof x.url === "string" && /^https:\/\/\S+$/.test(x.url))
        .map((x) => ({ label: SOCIAL_NETWORKS.find(([k]) => k === x.network)?.[1] ?? "Link", href: x.url }))
    : [];
  const sectionsRaw = m.get("homepage.sections");
  const sections = { ...d.sections };
  if (sectionsRaw && typeof sectionsRaw === "object") {
    for (const [k] of HOMEPAGE_SECTIONS) if (typeof (sectionsRaw as Record<string, unknown>)[k] === "boolean") sections[k] = (sectionsRaw as Record<string, boolean>)[k];
  }
  return {
    name: str(m.get("brand.name"), d.name),
    tagline: str(m.get("brand.tagline"), d.tagline),
    description: str(m.get("brand.description"), d.description),
    logoUrl: storageUrl("media", strOrNull(m.get("brand.logo_path"))),
    contactEmail: strOrNull(m.get("contact.email")),
    mailingAddress: strOrNull(m.get("contact.mailing_address")),
    social,
    footerNote: str(m.get("footer.note"), d.footerNote),
    sections,
    newsletterIntro: str(m.get("newsletter.intro"), d.newsletterIntro),
    seo: {
      defaultTitle: str(m.get("seo.default_title"), d.seo.defaultTitle),
      defaultDescription: str(m.get("seo.default_description"), d.description),
      ogImageUrl: storageUrl("media", strOrNull(m.get("seo.default_og_image_path"))),
      allowIndexing: m.get("seo.allow_indexing") === true,
    },
    adsTxt: typeof m.get("ads.txt") === "string" ? String(m.get("ads.txt")) : "",
  };
}

/** Website settings from Admin → Settings, cached for 5 minutes and refreshed on save. */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
    const { data, error } = await publicClient().from("site_settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    return parseSettings(data);
  },
  ["site-settings"],
  { revalidate: 300, tags: ["site-settings"] },
);

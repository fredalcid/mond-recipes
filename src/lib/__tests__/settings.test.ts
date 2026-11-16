import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
const { DEFAULT_SETTINGS, parseSettings } = await import("@/lib/settings");

describe("parseSettings", () => {
  it("falls back to defaults when nothing is stored", () => {
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("never allows indexing unless it is explicitly true", () => {
    expect(parseSettings([{ key: "seo.allow_indexing", value: "true" }]).seo.allowIndexing).toBe(false);
    expect(parseSettings([{ key: "seo.allow_indexing", value: 1 }]).seo.allowIndexing).toBe(false);
    expect(parseSettings([{ key: "seo.allow_indexing", value: true }]).seo.allowIndexing).toBe(true);
  });

  it("keeps only https social links and names them", () => {
    const s = parseSettings([
      {
        key: "social.links",
        value: [
          { network: "instagram", url: "https://instagram.com/mondrecipes" },
          { network: "facebook", url: "javascript:alert(1)" },
          { network: "youtube", url: "http://youtube.com/x" },
        ],
      },
    ]);
    expect(s.social).toEqual([{ label: "Instagram", href: "https://instagram.com/mondrecipes" }]);
  });

  it("reads homepage section switches and ignores unknown or malformed ones", () => {
    const s = parseSettings([{ key: "homepage.sections", value: { shop: false, articles: "no", unknown: false } }]);
    expect(s.sections.shop).toBe(false);
    expect(s.sections.articles).toBe(true);
    expect(Object.keys(s.sections)).not.toContain("unknown");
  });

  it("uses stored brand text and trims blanks back to defaults", () => {
    const s = parseSettings([
      { key: "brand.name", value: "Mònd" },
      { key: "brand.tagline", value: "   " },
      { key: "contact.email", value: "hello@example.com" },
      { key: "contact.mailing_address", value: null },
    ]);
    expect(s.name).toBe("Mònd");
    expect(s.tagline).toBe(DEFAULT_SETTINGS.tagline);
    expect(s.contactEmail).toBe("hello@example.com");
    expect(s.mailingAddress).toBeNull();
  });
});

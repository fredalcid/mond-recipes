import { describe, expect, it } from "vitest";
import { formatMinutes, formatRating, slugify } from "@/lib/format";
import { joinSchema, newsletterSchema, safeNextPath, updatePasswordSchema } from "@/lib/validation";
import { footerNav, primaryNav } from "@/lib/site";

describe("navigation follows the specification", () => {
  it("has exactly the approved items, in order", () => {
    expect(primaryNav.map((n) => n.label)).toEqual([
      "Home",
      "Recipes",
      "Explore by Country",
      "Drinks & Tea",
      "Community",
      "Articles & Videos",
      "Shop",
    ]);
  });

  it("contains no excluded features", () => {
    const all = [...primaryNav, ...footerNav.flatMap((g) => g.links)].map((n) => `${n.label} ${n.href}`.toLowerCase());
    for (const banned of ["ai kitchen", "meal planner", "checkout", "cart"]) {
      expect(all.some((s) => s.includes(banned))).toBe(false);
    }
  });

  it("footer includes every required link", () => {
    const labels = footerNav.flatMap((g) => g.links.map((l) => l.label));
    for (const required of [
      "About Mònd Recipes",
      "Contact",
      "Privacy Policy",
      "Terms of Service",
      "Cookie Policy",
      "Affiliate Disclosure",
      "Community Guidelines",
      "Submit a Recipe",
      "Advertise With Us",
    ]) {
      expect(labels).toContain(required);
    }
  });
});

describe("formatting", () => {
  it("formats cooking times", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(75)).toBe("1 hr 15 min");
    expect(formatMinutes(null)).toBe("—");
  });

  it("never invents a rating", () => {
    expect(formatRating(null, 0)).toBe("Not yet rated");
    expect(formatRating(4.5, 0)).toBe("Not yet rated");
    expect(formatRating(4.25, 1)).toBe("4.3 · 1 rating");
    expect(formatRating(4, 1200)).toBe("4.0 · 1,200 ratings");
  });

  it("makes URL slugs from accented names", () => {
    expect(slugify("Mònd Recipes")).toBe("mond-recipes");
    expect(slugify("Crème Brûlée & Café")).toBe("creme-brulee-and-cafe");
    expect(slugify("  Côte d'Ivoire ")).toBe("cote-d-ivoire");
  });
});

describe("validation", () => {
  const valid = { name: "Ada Lovelace", email: "ADA@Example.com ", password: "tomatoes2026", terms: "on", age: "on" };

  it("requires confirming the person is 14 or older", () => {
    const { age: _age, ...noAge } = valid;
    void _age;
    expect(joinSchema.safeParse(noAge).success).toBe(false);
  });

  it("accepts a valid registration and normalises the email", () => {
    const r = joinSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("ada@example.com");
  });

  it("rejects weak passwords, missing terms and HTML in names", () => {
    expect(joinSchema.safeParse({ ...valid, password: "short1" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, password: "nonumbershere" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, terms: undefined }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, name: "<script>" }).success).toBe(false);
  });

  it("requires matching passwords when resetting", () => {
    expect(updatePasswordSchema.safeParse({ password: "tomatoes2026", confirm: "tomatoes2026" }).success).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "tomatoes2026", confirm: "tomatoes2027" }).success).toBe(false);
  });

  it("requires explicit newsletter consent", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: "on" }).success).toBe(true);
    expect(newsletterSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
  });

  it("blocks open redirects after sign-in", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath(undefined, "/")).toBe("/");
  });
});

describe("safeNextPath (redirect tricks)", () => {
  it.each(["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/%2F%2Fevil.example/../x", "javascript:alert(1)", "https:evil.example"])(
    "keeps %s on this site",
    (next) => {
      const out = safeNextPath(next);
      expect(out.startsWith("/")).toBe(true);
      expect(out.startsWith("//")).toBe(false);
      expect(new URL(out, "https://mondrecipes.com").host).toBe("mondrecipes.com");
    },
  );
  it("keeps the query and fragment of a normal path", () => expect(safeNextPath("/recipes?country=japan#top")).toBe("/recipes?country=japan#top"));
});

import { adsAllowedOn } from "@/components/ads/AdUnit";
describe("ad placement rules", () => {
  it("never shows ads on sign-in, account, admin, form or legal pages", () => {
    for (const p of ["/admin", "/admin/recipes", "/account", "/sign-in", "/join", "/reset-password", "/submit/recipe", "/community/new", "/privacy", "/terms", "/cookies", "/notifications"])
      expect(adsAllowedOn(p)).toBe(false);
  });
  it("allows ads on content pages", () => {
    for (const p of ["/", "/recipes/jollof-rice", "/articles/x", "/countries/italy", "/community", "/community/posts/1", "/termsandmore"]) expect(adsAllowedOn(p)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { convert, formatQuantity, scale, unitLabel } from "@/lib/units";
import { parseSearchParams, toQueryParams } from "@/lib/search-params";
import { demoSource, similarity } from "@/lib/data/demo-source";
import { recipes } from "@/lib/demo/library";
import { categoryList, dietList, allergenList, drinkCategoryList } from "@/lib/demo/taxonomy";
import { countries, ingredients } from "@/lib/demo/library";

describe("serving size", () => {
  it("scales quantities", () => {
    expect(scale(2, 1.5)).toBe(3);
    expect(scale(null, 2)).toBeNull();
  });
});

describe("unit conversion", () => {
  it("leaves amounts alone when showing them as written", () => {
    expect(convert(2, "cup", "original", 125)).toEqual({ quantity: 2, unit: "cup", approximate: false });
  });

  it("converts weight to weight exactly", () => {
    const lb = convert(1000, "g", "us");
    expect(lb.unit).toBe("lb");
    expect(lb.quantity).toBeCloseTo(2.2046, 3);
    expect(lb.approximate).toBe(false);
    expect(convert(8, "oz", "metric")).toMatchObject({ unit: "g", approximate: false });
  });

  it("converts volume to volume exactly", () => {
    const ml = convert(1, "cup", "metric");
    expect(ml).toMatchObject({ unit: "ml", approximate: false });
    expect(ml.quantity).toBeCloseTo(236.6, 1);
    expect(convert(250, "ml", "us")).toMatchObject({ unit: "cup", approximate: false });
    expect(convert(30, "ml", "us").unit).toBe("tbsp");
    expect(convert(5, "ml", "us").unit).toBe("tsp");
  });

  it("uses ingredient density for cups → grams, and marks it approximate", () => {
    const flour = convert(1, "cup", "metric", 125);
    expect(flour).toMatchObject({ unit: "g", approximate: true });
    expect(flour.quantity).toBeCloseTo(125, 5);
    const sugar = convert(1, "cup", "metric", 200);
    expect(sugar.quantity).toBeCloseTo(200, 5); // not one universal factor
  });

  it("never converts counted items", () => {
    expect(convert(3, "clove", "metric")).toEqual({ quantity: 3, unit: "clove", approximate: false });
    expect(convert(2, "piece", "us")).toEqual({ quantity: 2, unit: "piece", approximate: false });
  });

  it("formats kitchen-friendly numbers", () => {
    expect(formatQuantity(0.5, "cup")).toBe("½");
    expect(formatQuantity(1.333, "cup")).toBe("1⅓");
    expect(formatQuantity(0.75, "tsp")).toBe("¾");
    expect(formatQuantity(236.588, "ml")).toBe("235");
    expect(formatQuantity(42.4, "g")).toBe("42");
    expect(unitLabel("cup", 2)).toBe("cups");
    expect(unitLabel("cup", 1)).toBe("cup");
  });
});

describe("search parameters", () => {
  it("accepts only known values", () => {
    const p = parseSearchParams({ q: "  jollof ", country: "nigeria", time: "30", difficulty: "easy", rating: "4", sort: "rating", page: "2" });
    expect(p).toMatchObject({ q: "jollof", country: "nigeria", maxMinutes: 30, difficulty: "easy", minRating: 4, sort: "rating", page: 2 });
  });

  it("rejects junk", () => {
    const p = parseSearchParams({ country: "<script>", time: "17", difficulty: "impossible", rating: "9", sort: "drop table", page: "-4" });
    expect(p).toMatchObject({ country: undefined, maxMinutes: undefined, difficulty: undefined, minRating: undefined, sort: "newest", page: 1 });
  });

  it("round-trips to a query string", () => {
    expect(toQueryParams(parseSearchParams({ q: "mint", type: "traditional-tea" }))).toMatchObject({ q: "mint", type: "traditional-tea", sort: undefined });
  });
});

describe("sample library integrity", () => {
  const slugs = (l: { slug: string }[]) => new Set(l.map((x) => x.slug));
  it("only uses slugs that exist in the database seed", () => {
    const cats = slugs(categoryList), diets = slugs(dietList), allergens = slugs(allergenList), drinks = slugs(drinkCategoryList);
    const ing = slugs(ingredients), ctry = slugs(countries);
    for (const r of recipes) {
      r.categories?.forEach((c) => expect(cats.has(c), `${r.slug}: category ${c}`).toBe(true));
      r.diets?.forEach((d) => expect(diets.has(d), `${r.slug}: diet ${d}`).toBe(true));
      r.allergens?.forEach((a) => expect(allergens.has(a), `${r.slug}: allergen ${a}`).toBe(true));
      if (r.drinkCategory) expect(drinks.has(r.drinkCategory)).toBe(true);
      r.countries.forEach((c) => expect(ctry.has(c), `${r.slug}: country ${c}`).toBe(true));
      r.ingredients.forEach(([, , s]) => expect(ing.has(s), `${r.slug}: ingredient ${s}`).toBe(true));
      expect(r.kind === "drink" ? Boolean(r.drinkCategory) : true).toBe(true);
    }
  });

  it("vegan recipes declare no milk or egg allergens", () => {
    for (const r of recipes.filter((x) => x.diets?.includes("vegan"))) {
      expect(r.allergens ?? []).not.toContain("milk");
      expect(r.allergens ?? []).not.toContain("eggs");
    }
  });
});

describe("sample search behaves like the database search", () => {
  it("combines filters", async () => {
    const res = await demoSource.searchRecipes({ kind: "food", category: "vegan", maxMinutes: 30 });
    expect(res.items.map((r) => r.title)).toEqual(["Black Bean Tacos"]);
    const drinks = await demoSource.searchRecipes({ kind: "drink", country: "india" });
    expect(drinks.items.map((r) => r.title).sort()).toEqual(["Mango Lassi", "Masala Chai"]);
  });

  it("finds typos and accents", async () => {
    expect(similarity("Jollof Rice", "jolof")).toBeGreaterThan(0.3);
    expect((await demoSource.searchRecipes({ q: "jolof" })).items[0]?.title).toBe("Jollof Rice");
  });

  it("never matches a minimum rating with unrated recipes", async () => {
    expect((await demoSource.searchRecipes({ minRating: 4 })).total).toBe(0);
  });

  it("ingredient finder ranks best match first and lists what's missing", async () => {
    const list = await demoSource.listIngredients();
    const id = (slug: string) => list.find((i) => i.slug === slug)!.id;
    const res = await demoSource.matchByIngredients([id("garlic"), id("onion"), id("olive-oil")]);
    expect(res[0].recipe.title).toBe("Chicken Tagine with Olives");
    expect(res[0].matched).toBe(3);
    expect(res[0].missing).not.toContain("Garlic");
  });

  it("lists a shared dish under every country it belongs to", async () => {
    expect((await demoSource.getCountry("ghana"))?.dishes.map((d) => d.title)).toContain("Jollof Rice");
    expect((await demoSource.getCountry("nigeria"))?.dishes.map((d) => d.title)).toContain("Jollof Rice");
  });

  it("keeps sample pages out of search engines", async () => {
    expect((await demoSource.getCountry("italy"))?.isIndexable).toBe(false);
    expect(await demoSource.listIndexableRecipes()).toEqual([]);
  });
});

import { recipePayloadSchema, toDatabasePayload, validateImage } from "@/lib/admin-schema";

describe("recipe editor validation", () => {
  const base = {
    kind: "food", title: "Plantain Chips", slug: "plantain-chips", summary: "", status: "draft", verification: "community",
    countries: [], regions: [], cuisines: [], categories: [], diets: [], allergens: [],
    ingredients: [{ name: "Plantain", quantity: "3", unit: "piece", note: "", group: "" }, { name: "", quantity: "", unit: "", note: "", group: "" }],
    steps: [{ body: "Fry.", timer_minutes: "4" }, { body: "", timer_minutes: "" }],
    source: { type: "original", description: "", url: "" },
  };

  it("accepts a draft and drops blank rows", () => {
    const r = recipePayloadSchema.safeParse(base);
    expect(r.success).toBe(true);
    const db = toDatabasePayload(r.success ? r.data : (null as never));
    expect(db.ingredients).toHaveLength(1);
    expect(db.steps).toEqual([{ body: "Fry.", timer_seconds: "240" }]);
    expect(db.id).toBeNull();
  });

  it("requires ingredients, steps and a country to publish", () => {
    const r = recipePayloadSchema.safeParse({ ...base, status: "published", ingredients: [], steps: [] });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["ingredients", "steps", "countries"]));
  });

  it("requires explicit confirmation for the test-kitchen badge", () => {
    expect(recipePayloadSchema.safeParse({ ...base, verification: "test_kitchen" }).success).toBe(false);
    expect(recipePayloadSchema.safeParse({ ...base, verification: "test_kitchen", verificationConfirmed: true }).success).toBe(true);
  });

  it("requires a drink type for drinks and rejects bad slugs and units", () => {
    expect(recipePayloadSchema.safeParse({ ...base, kind: "drink" }).success).toBe(false);
    expect(recipePayloadSchema.safeParse({ ...base, slug: "Bad Slug!" }).success).toBe(false);
    expect(recipePayloadSchema.safeParse({ ...base, ingredients: [{ ...base.ingredients[0], unit: "bucket" }] }).success).toBe(false);
  });

  it("checks uploaded images", () => {
    expect(validateImage(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPEG/);
    expect(validateImage(new File([new Uint8Array(9 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }))).toMatch(/8 MB/);
    expect(validateImage(new File(["x"], "a.webp", { type: "image/webp" }))).toBeNull();
  });
});

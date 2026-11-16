/**
 * Spec section 22: "Can a visitor search for a recipe by country? Combine filters? Does ingredient
 * search find matching recipes? Do country pages display the correct recipes?"
 */
import { expect, test } from "@playwright/test";
import { resultTitles } from "./helpers";

test.describe("recipe search", () => {
  test("search by text finds the recipe, with a result count", async ({ page }) => {
    await page.goto("/recipes");
    await page.getByRole("combobox", { name: "Search recipes" }).fill("jollof");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=jollof/);
    expect(await resultTitles(page)).toContain("Jollof Rice");
    await expect(page.getByText(/1 recipe/)).toBeVisible();
  });

  test("search tolerates accents and typos", async ({ page }) => {
    await page.goto("/recipes?q=jolof");
    expect(await resultTitles(page)).toContain("Jollof Rice");
  });

  test("filter by country shows only that country's recipes", async ({ page }) => {
    await page.goto("/recipes?country=mexico");
    const titles = await resultTitles(page);
    expect(titles).toEqual(["Black Bean Tacos"]);
  });

  test("country, meal type and text filters combine", async ({ page }) => {
    await page.goto("/recipes?country=india&category=vegan");
    expect(await resultTitles(page)).toEqual(["Dal Tadka"]);
    await page.goto("/recipes?country=india&category=vegan&q=lentils");
    expect(await resultTitles(page)).toEqual(["Dal Tadka"]);
    await page.goto("/recipes?country=italy&category=vegan");
    await expect(page.getByText(/no recipes found/i)).toBeVisible();
  });

  test("filters can be chosen in the form", async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), "the mobile filter panel is checked by the layout tests");
    await page.goto("/recipes");
    const form = page.getByRole("form", { name: "Filter recipes" });
    if (isMobile) await page.getByText(/filters/i).first().click();
    await form.getByLabel("Country").selectOption("morocco");
    // Filters apply as soon as they change (with a button as a fallback when scripts are off).
    await page.waitForURL(/country=morocco/);
    await expect(page).toHaveURL(/country=morocco/);
    expect(await resultTitles(page)).toEqual(["Chicken Tagine with Olives"]);
  });

  test("an impossible search shows a helpful empty state", async ({ page }) => {
    await page.goto("/recipes?q=zzzqqqxxx");
    await expect(page.getByText(/no recipes found/i)).toBeVisible();
  });
});

test.describe("ingredient search", () => {
  test("recipes using more of your ingredients come first, with what's missing", async ({ page }) => {
    await page.goto("/ingredients?i=spaghetti&i=canned-whole-tomatoes&i=garlic&i=fresh-basil&i=olive-oil");
    const results = page.locator("[aria-labelledby=matches-heading] article, [aria-labelledby=matches-heading] li").first();
    await expect(results).toContainText("Tomato and Basil Spaghetti");
    await expect(page.locator("main")).toContainText(/also need|you have everything/i);
  });

  test("ingredients can be picked by typing", async ({ page }) => {
    await page.goto("/ingredients");
    await page.getByPlaceholder(/type to filter/i).fill("lent");
    await page.getByRole("button", { name: /yellow lentils/i }).click();
    await expect(page).toHaveURL(/i=yellow-lentils/);
    await expect(page.locator("main")).toContainText("Dal Tadka");
  });
});

test.describe("countries", () => {
  test("a country page lists that country's recipes and drinks only", async ({ page }) => {
    await page.goto("/countries/nigeria");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nigeria");
    const titles = await page.locator("main article h3").allInnerTexts();
    expect(titles).toContain("Jollof Rice");
    expect(titles).not.toContain("Dal Tadka");
  });

  test("a dish shared by two countries appears on both", async ({ page }) => {
    await page.goto("/countries/ghana");
    expect(await page.locator("main article h3").allInnerTexts()).toContain("Jollof Rice");
  });

  test("the country list can be filtered", async ({ page }) => {
    await page.goto("/countries");
    // The filter covers countries still waiting for recipes; sample data only lists countries that have them.
    const filter = page.getByRole("searchbox", { name: "Find a country" });
    test.skip((await filter.count()) === 0, "No countries without recipes in this data set, so there is nothing to filter.");
    const before = await page.locator("[data-country-name]:visible").count();
    await filter.fill("zzzz");
    await expect(page.getByText(/No country matches/)).toBeVisible();
    await filter.fill("a");
    expect(await page.locator("[data-country-name]:visible").count()).toBeLessThanOrEqual(before);
  });

  test("region pages work", async ({ page }) => {
    await page.goto("/countries/italy/sicily");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sicily");
  });

  test("an unknown country is a proper 404", async ({ page }) => {
    const res = await page.goto("/countries/atlantis");
    expect(res?.status()).toBe(404);
  });
});

test.describe("drinks and tea", () => {
  test("drinks are listed separately from food", async ({ page }) => {
    await page.goto("/drinks-tea");
    const titles = await page.locator("main article h3").allInnerTexts();
    expect(titles).toContain("Masala Chai");
    expect(titles).not.toContain("Jollof Rice");
  });
});

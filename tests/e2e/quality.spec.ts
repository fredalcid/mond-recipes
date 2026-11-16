/** Accessibility (axe, WCAG 2.1 AA), SEO basics, responsive layout and errors on every key page. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { KEY_PAGES, expectNoHorizontalScroll, watchErrors } from "./helpers";

for (const path of KEY_PAGES) {
  test.describe(path, () => {
    test("loads without errors, fits the screen and has one main heading", async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(path);
      expect(res?.status(), "status").toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalScroll(page);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(errors, errors.join("\n")).toEqual([]);
    });

    test("meets WCAG 2.1 AA (automated checks)", async ({ page }, info) => {
      test.skip(info.project.name !== "chromium" && info.project.name !== "mobile", "accessibility is checked in Chrome");
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`),
        "serious accessibility problems",
      ).toEqual([]);
    });

    test("has a title, description and canonical address", async ({ page }, info) => {
      test.skip(info.project.name !== "chromium", "SEO tags are the same on every device");
      await page.goto(path);
      expect((await page.title()).length).toBeGreaterThan(5);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length ?? 0, "meta description").toBeGreaterThan(30);
      if (!["/sign-in", "/join", "/submit/recipe"].includes(path)) {
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      }
      for (const img of await page.locator("main img").all()) {
        expect(await img.getAttribute("alt"), "every image has alt text (empty for decorative)").not.toBeNull();
      }
    });
  });
}

test("the mobile menu opens and lists every section", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: /menu/i }).click();
  for (const label of ["Recipes", "Explore by Country", "Drinks & Tea", "Community", "Articles & Videos", "Shop"]) {
    await expect(page.getByRole("link", { name: label }).last()).toBeVisible();
  }
});

test("robots.txt and the sitemap respond", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<urlset");
});

test("sample content is never indexed", async ({ page }) => {
  await page.goto("/recipes/jollof-rice");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // Breadcrumb data is fine; recipe data (which would put it in Google's recipe results) is not.
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(data.join(" ")).not.toContain('"@type":"Recipe"');
});

test("security headers are sent", async ({ request }) => {
  const h = (await request.get("/")).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

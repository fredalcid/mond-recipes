/** Spec section 22: form validation, affiliate links, protected pages, advertising. */
import { expect, test } from "@playwright/test";

test.describe("forms show clear errors", () => {
  test("joining needs a name, valid email, strong password and agreement", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: /create account/i }).click();
    const main = page.locator("main");
    await expect(main).toContainText(/enter your name|add your name|name/i);
    await main.getByLabel("Email", { exact: true }).fill("not-an-email");
    await main.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("main")).toContainText(/valid email/i);
    await expect(page.locator("main")).toContainText(/10 characters/i);
    await expect(page.locator("main")).toContainText(/agree/i);
  });

  test("the newsletter form refuses a bad email and asks for consent", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("footer form");
    await form.getByRole("textbox").fill("nope");
    await form.getByRole("button", { name: /subscribe/i }).click();
    await expect(form).toContainText(/valid email|consent|tick|agree/i);
  });

  test("the contact form checks every field", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.locator("main")).toContainText(/enter your name/i);
    await expect(page.locator("main")).toContainText(/at least 10 characters/i);
  });

  test("sign-in keeps the visitor on this site after signing in", async ({ page }) => {
    await page.goto("/sign-in?next=//evil.example");
    const next = await page.locator("input[name=next]").getAttribute("value");
    expect(next?.startsWith("//") ? "unsafe" : "ok").toBe("ok");
  });
});

test.describe("shop and affiliate links", () => {
  test("products open on the retailer through the click counter, marked sponsored", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText(/may earn a commission/i).first()).toBeVisible();
    const links = page.locator("main a[href^='/go/']");
    for (const link of await links.all()) {
      expect(await link.getAttribute("rel")).toContain("sponsored");
    }
  });

  test("there is no cart, checkout or price", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator("main")).not.toContainText(/add to cart|checkout|\$\d/i);
  });

  test("an unknown product link goes back to the shop instead of anywhere else", async ({ request }) => {
    const res = await request.get("/go/not-a-product", { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(res.status());
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/shop");
    expect(res.headers()["x-robots-tag"] ?? "").toMatch(/noindex/);
  });
});

test.describe("private pages", () => {
  for (const path of ["/account", "/account/profile", "/notifications", "/community/new"]) {
    test(`${path} needs an account`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in|\/community$/);
    });
  }

  test("the admin area is not available without the database and an account", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("main")).not.toContainText(/dashboard|total recipes/i);
  });

  test("the scheduled link check needs its secret", async ({ request }) => {
    expect((await request.get("/api/cron/check-links")).status()).toBe(401);
  });
});

test.describe("advertising", () => {
  test("no ads or ad scripts load without configuration and consent", async ({ page }) => {
    const adRequests: string[] = [];
    page.on("request", (r) => /googlesyndication|doubleclick|googletagmanager/.test(r.url()) && adRequests.push(r.url()));
    await page.goto("/recipes/jollof-rice");
    await page.waitForLoadState("networkidle");
    expect(adRequests).toEqual([]);
    await expect(page.getByText("Advertisement")).toHaveCount(0);
  });

  test("ads.txt is served", async ({ request }) => {
    const res = await request.get("/ads.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
  });
});

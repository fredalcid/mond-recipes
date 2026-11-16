/** Spec section 7 and 22: serving sizes, units, cooking mode, print, share, save. */
import { expect, test } from "@playwright/test";

test.describe("recipe page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/recipes/tomato-and-basil-spaghetti");
  });

  test("changing servings recalculates ingredient quantities", async ({ page }) => {
    const ingredients = page.locator("section[aria-labelledby=ingredients-heading] li");
    await expect(ingredients.first()).toContainText("400");
    await page.getByRole("button", { name: "More servings" }).click();
    await page.getByRole("button", { name: "More servings" }).click();
    await page.getByRole("button", { name: "More servings" }).click();
    await page.getByRole("button", { name: "More servings" }).click();
    await expect(page.locator("output").first()).toHaveText("8");
    await expect(ingredients.first()).toContainText("800");
    await page.getByRole("button", { name: "Fewer servings" }).click();
    await page.getByRole("button", { name: "Fewer servings" }).click();
    await expect(ingredients.first()).toContainText("600");
  });

  test("metric and US measurements switch", async ({ page }) => {
    const first = page.locator("section[aria-labelledby=ingredients-heading] li").first();
    await page.getByRole("radio", { name: "US" }).check({ force: true }).catch(() => page.getByText("US", { exact: true }).click());
    await expect(first).toContainText(/oz|lb/);
    await page.getByRole("radio", { name: "Metric" }).check({ force: true }).catch(() => page.getByText("Metric", { exact: true }).click());
    await expect(first).toContainText(/g\b/);
  });

  test("cooking mode walks through the steps", async ({ page }) => {
    await page.getByRole("button", { name: /start cooking mode/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/gather your ingredients/i);
    await dialog.getByRole("button", { name: /start step 1/i }).click();
    await expect(dialog).toContainText(/step 1/i);
    await dialog.getByRole("button", { name: /step 2|next/i }).click();
    await expect(dialog).toContainText(/step 2/i);
    await dialog.getByRole("button", { name: "Exit" }).click();
    await expect(dialog).toBeHidden();
  });

  test("saving explains why it isn't available yet (sample mode)", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await expect(save).toHaveAttribute("title", /member accounts/i);
  });

  test("print and share are available", async ({ page }) => {
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
  });

  test("sample recipes are labelled and have no invented ratings", async ({ page }) => {
    await expect(page.getByText(/sample recipe/i).first()).toBeVisible();
    await expect(page.locator("main")).toContainText(/no ratings yet|not yet rated/i);
    await expect(page.locator("main")).not.toContainText(/test-kitchen verified/i);
  });

  test("an unknown recipe is a proper 404", async ({ page }) => {
    const res = await page.goto("/recipes/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /recipes/i }).first()).toBeVisible();
  });
});

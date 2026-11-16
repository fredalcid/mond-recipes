import { expect, type Page } from "@playwright/test";

/** Pages every general check visits. All exist in sample mode. */
export const KEY_PAGES = [
  "/",
  "/recipes",
  "/recipes/jollof-rice",
  "/recipes/tomato-and-basil-spaghetti",
  "/ingredients",
  "/countries",
  "/countries/nigeria",
  "/countries/italy/sicily",
  "/drinks-tea",
  "/drinks-tea/masala-chai",
  "/community",
  "/community/challenges",
  "/articles",
  "/articles/how-to-brew-loose-leaf-tea",
  "/videos",
  "/shop",
  "/shop/tea-equipment",
  "/about",
  "/contact",
  "/advertise",
  "/affiliate-disclosure",
  "/community-guidelines",
  "/privacy",
  "/terms",
  "/cookies",
  "/sign-in",
  "/join",
  "/submit/recipe",
];

/** Collects page errors and console errors (including blocked-by-CSP messages). */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page is wider than the screen").toBeLessThanOrEqual(0);
}

/** Recipe titles shown in result cards. */
export async function resultTitles(page: Page): Promise<string[]> {
  return page.locator("main article h3").allInnerTexts();
}

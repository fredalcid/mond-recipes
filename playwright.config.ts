import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build in sample mode (no database needed):
 *   npm run build && npm run test:e2e
 * Chrome is used by default. To also test Firefox and Safari's engine (WebKit):
 *   npx playwright install firefox webkit && npm run test:e2e -- --project=firefox --project=webkit
 * Set CHROME_PATH to use an installed Chrome instead of Playwright's own.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const chromeLaunch = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/e2e-report" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: chromeLaunch } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: chromeLaunch } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});

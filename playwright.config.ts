import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a server that is already up, normally the Worker build:
 *   npm run preview -- --var ADMIN_EMAIL:<test email> --var ADMIN_PASSWORD_HASH:<hash of a test password>
 *   E2E_ADMIN_EMAIL=<test email> E2E_ADMIN_PASSWORD=<test password> npm run test:e2e
 * Admin specs skip themselves without E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. Use throwaway
 * credentials made with `npm run admin:hash-password`, never the production ones.
 * See docs/TESTING.md.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:8787",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});

import { defineConfig, devices } from "@playwright/test"

const IS_CI = !!process.env["CI"]
const PORT = process.env["PORT"] ?? "3000"
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI ? "github" : "html",
  /* Hard cap: if all tests together exceed this, abort immediately. */
  globalTimeout: IS_CI ? 5 * 60_000 : 0,
  /* Per-test timeout */
  timeout: IS_CI ? 15_000 : 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /* CI: only chromium (it's the only browser installed).
     Local: chromium + firefox + mobile-chrome for full coverage. */
  projects: IS_CI
    ? [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
      ],

  /* CI: production server (fast, deterministic).
     Local: dev server (HMR, reuse if already running). */
  webServer: {
    command: IS_CI ? "pnpm start" : "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: IS_CI ? 60_000 : 30_000,
  },
})

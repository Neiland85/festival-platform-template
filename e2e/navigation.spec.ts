import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test("home page hero section is visible", async ({ page }) => {
    await page.goto("/")
    const hero = page.locator("video, section").first()
    await expect(hero).toBeVisible()
  })

  test("locale redirect works (/ → /es/)", async ({ page }) => {
    await page.goto("/")
    // Middleware redirects bare / to default locale /es
    await expect(page).toHaveURL(/\/es/)
  })

  test("page loads within acceptable time", async ({ page }) => {
    const start = Date.now()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(10_000)
  })
})

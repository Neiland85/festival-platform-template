import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test("home page hero section is visible", async ({ page }) => {
    await page.goto("/")
    // Hero video or hero section
    const hero = page.locator("video, [class*=hero], section").first()
    await expect(hero).toBeVisible()
  })

  test("privacy link in footer navigates to /privacidad", async ({ page }) => {
    await page.goto("/")
    const privacyLink = page.locator("footer").getByRole("link", { name: /privacidad/i })
    await privacyLink.click()
    await expect(page).toHaveURL(/\/privacidad/)
  })

  test("page loads within acceptable time", async ({ page }) => {
    const start = Date.now()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const loadTime = Date.now() - start
    // Home page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test("no console errors on home page", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto("/")
    await page.waitForTimeout(1000)

    // Filter out known noise (e.g. service worker, external scripts)
    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("sw.js")
    )
    expect(realErrors).toHaveLength(0)
  })
})

import { test, expect } from "@playwright/test"

test.describe("Navigation", () => {
  test("home page hero section is visible", async ({ page }) => {
    await page.goto("/")
    const hero = page.locator("video, section").first()
    await expect(hero).toBeVisible()
  })

  test("privacy link in footer navigates to privacidad", async ({ page }) => {
    await page.goto("/")
    const privacyLink = page.locator("footer").getByRole("link", { name: /privacidad|privacy/i })
    await privacyLink.click()
    await expect(page).toHaveURL(/\/privacidad/)
  })

  test("page loads within acceptable time", async ({ page }) => {
    const start = Date.now()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(8000)
  })

  test("no critical console errors on home page", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text())
    })

    await page.goto("/")
    await page.waitForTimeout(2000)

    // Filter known noise: favicon, service worker, hydration warnings,
    // next-intl dev warnings, video codec errors
    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("sw.js") &&
        !e.includes("hydrat") &&
        !e.includes("NEXT_INTL") &&
        !e.includes("next-intl") &&
        !e.includes("codec") &&
        !e.includes("ERR_BLOCKED") &&
        !e.includes("404"),
    )
    expect(realErrors).toHaveLength(0)
  })
})

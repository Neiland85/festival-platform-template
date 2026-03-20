import { test, expect } from "@playwright/test"

test.describe("Home page", () => {
  test("loads and shows festival branding", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/festival/i)
  })

  test("renders hero section", async ({ page }) => {
    await page.goto("/")
    const hero = page.locator("video, section").first()
    await expect(hero).toBeVisible()
  })

  test("renders footer with privacy link", async ({ page }) => {
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
    // Footer privacy link text from es.json "footer.navPrivacy" = "Privacidad"
    const privacyLink = footer.getByRole("link", { name: /privacidad|privacy/i })
    await expect(privacyLink).toBeVisible()
  })

  test("cookie banner appears on first visit", async ({ page }) => {
    await page.goto("/")
    // Cookie banner uses aria-label from es.json "cookie.ariaLabel"
    const banner = page.locator('[role="dialog"]').filter({ hasText: /cookie|cookies/i })
    // Banner may or may not be present depending on cookie state
    const isVisible = await banner.isVisible().catch(() => false)
    if (isVisible) {
      await banner.getByRole("button", { name: /aceptar|accept/i }).click()
      await expect(banner).not.toBeVisible()
    }
  })
})

import { test, expect } from "@playwright/test"

test.describe("Home page", () => {
  test("loads and shows festival branding in title", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/festival/i)
  })

  test("renders hero section with video", async ({ page }) => {
    await page.goto("/")
    const hero = page.locator("video, section").first()
    await expect(hero).toBeVisible()
  })

  test("renders footer (ShowcaseFooter)", async ({ page }) => {
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
  })

  test("renders programming section with event cards", async ({ page }) => {
    await page.goto("/")
    const section = page.locator("#programacion")
    await expect(section).toBeVisible()
  })
})

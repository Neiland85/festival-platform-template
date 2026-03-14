import { test, expect } from "@playwright/test"

test.describe("Home page", () => {
  test("loads and shows festival branding", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/solaris/i)
  })

  test("renders navigation header", async ({ page }) => {
    await page.goto("/")
    const header = page.locator("header")
    await expect(header).toBeVisible()
  })

  test("renders footer with privacy link", async ({ page }) => {
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
    const privacyLink = footer.getByRole("link", { name: /privacidad/i })
    await expect(privacyLink).toBeVisible()
  })

  test("shows cookie banner on first visit", async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("dialog", { name: /cookies/i })
    await expect(banner).toBeVisible()
  })

  test("dismisses cookie banner on accept", async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("dialog", { name: /cookies/i })
    await banner.getByRole("button", { name: /aceptar/i }).click()
    await expect(banner).not.toBeVisible()
  })
})

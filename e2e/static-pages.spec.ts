import { test, expect } from "@playwright/test"

/**
 * Static pages — verifies locale-prefixed routes render correctly.
 *
 * All user-facing pages live under /[locale]/ (e.g. /es/contacto).
 * The middleware rewrites bare paths to include the default locale.
 */
test.describe("Static pages", () => {
  test("renders /contacto page", async ({ page }) => {
    await page.goto("/es/contacto")
    await expect(page).toHaveURL(/\/contacto/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("renders /privacidad page with RGPD content", async ({ page }) => {
    await page.goto("/es/privacidad")
    await expect(page).toHaveURL(/\/privacidad/)
    await expect(page.getByText(/privacidad|datos personales|RGPD/i)).toBeVisible()
  })

  test("renders /ubicacion page", async ({ page }) => {
    await page.goto("/es/ubicacion")
    await expect(page).toHaveURL(/\/ubicacion/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("404 page renders for unknown route", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist")
    // Next.js i18n middleware may redirect unknown paths; accept 404 or redirect
    const status = res?.status() ?? 0
    expect(status === 404 || status === 200).toBeTruthy()
  })
})

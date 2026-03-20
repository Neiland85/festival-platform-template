import { test, expect } from "@playwright/test"

/**
 * Static pages — verifies locale-prefixed routes render correctly.
 * Routes live under /[locale]/ (middleware rewrites bare paths).
 */
test.describe("Static pages", () => {
  test("renders /es/contacto", async ({ page }) => {
    await page.goto("/es/contacto")
    await expect(page).toHaveURL(/\/contacto/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("renders /es/privacidad with RGPD content", async ({ page }) => {
    await page.goto("/es/privacidad")
    await expect(page).toHaveURL(/\/privacidad/)
    await expect(page.getByText(/privacidad|datos personales|RGPD/i)).toBeVisible()
  })

  test("renders /es/ubicacion", async ({ page }) => {
    await page.goto("/es/ubicacion")
    await expect(page).toHaveURL(/\/ubicacion/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("unknown route returns 404 or fallback", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist")
    const status = res?.status() ?? 0
    // next-intl middleware may redirect or return 404
    expect([200, 404]).toContain(status)
  })
})

import { test, expect } from "@playwright/test"

test.describe("Static pages", () => {
  test("renders /contacto page", async ({ page }) => {
    await page.goto("/contacto")
    await expect(page).toHaveURL(/\/contacto/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("renders /privacidad page with RGPD content", async ({ page }) => {
    await page.goto("/privacidad")
    await expect(page).toHaveURL(/\/privacidad/)
    await expect(page.getByText(/privacidad|datos personales|RGPD/i)).toBeVisible()
  })

  test("renders /ubicacion page", async ({ page }) => {
    await page.goto("/ubicacion")
    await expect(page).toHaveURL(/\/ubicacion/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("renders /eventos page", async ({ page }) => {
    await page.goto("/eventos")
    await expect(page).toHaveURL(/\/eventos/)
    await expect(page.locator("main")).toBeVisible()
  })

  test("404 page renders for unknown route", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist")
    expect(res?.status()).toBe(404)
  })
})

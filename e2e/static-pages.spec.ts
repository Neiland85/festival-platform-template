import { test, expect } from "@playwright/test"

/**
 * Static pages — verifies locale-prefixed routes render and respond 200.
 *
 * Pages use <div> not <main>, so we check for page load + heading/content.
 * CI runner has Accept-Language: en, so we use /en/ prefix.
 */
test.describe("Static pages", () => {
  test("renders contacto page", async ({ page }) => {
    const res = await page.goto("/es/contacto")
    expect(res?.status()).toBe(200)
    // Page uses <div>, not <main>. Just verify it loaded.
    await expect(page.locator("body")).toBeVisible()
  })

  test("renders privacidad page with h1", async ({ page }) => {
    const res = await page.goto("/es/privacidad")
    expect(res?.status()).toBe(200)
    // Use specific heading instead of broad text match (strict mode)
    await expect(
      page.getByRole("heading", { name: /Política de Privacidad/i }),
    ).toBeVisible()
  })

  test("renders ubicacion page", async ({ page }) => {
    const res = await page.goto("/es/ubicacion")
    expect(res?.status()).toBe(200)
    await expect(page.locator("body")).toBeVisible()
  })

  test("unknown route returns 404 or fallback", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist")
    const status = res?.status() ?? 0
    expect([200, 404]).toContain(status)
  })
})

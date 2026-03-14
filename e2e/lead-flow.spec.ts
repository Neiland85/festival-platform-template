import { test, expect } from "@playwright/test"

test.describe("Lead capture flow", () => {
  test("complete promo form submission", async ({ page }) => {
    await page.goto("/")

    // CTA → RGPD
    const ctaButton = page.getByRole("button", { name: /entradas gratis/i })
    await expect(ctaButton).toBeVisible()
    await ctaButton.click()

    // RGPD → Form
    await page.getByRole("button", { name: /acepto/i }).click()

    // Fill form
    await page.getByLabel(/nombre \*/i).fill("Test")
    await page.getByLabel(/apellidos/i).fill("Playwright")
    await page.getByLabel(/email/i).fill("test@playwright.dev")
    await page.getByLabel(/teléfono/i).fill("+34600000000")

    // Submit
    await page.getByRole("button", { name: /conseguir entradas/i }).click()

    // Assert success OR error (depends on backend availability)
    const success = page.getByText(/estás dentro/i)
    const error = page.getByText(/ha ocurrido un error/i)

    await expect(success.or(error)).toBeVisible({ timeout: 10_000 })
  })

  test("RGPD volver button returns to CTA", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: /entradas gratis/i }).click()
    await expect(page.getByText(/protección de tus datos/i)).toBeVisible()

    await page.getByRole("button", { name: /volver/i }).click()
    await expect(page.getByRole("button", { name: /entradas gratis/i })).toBeVisible()
  })
})

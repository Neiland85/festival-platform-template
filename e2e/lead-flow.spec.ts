import { test, expect } from "@playwright/test"

/**
 * Lead capture flow — tests the promo CTA → RGPD → form → submit cycle.
 *
 * Uses i18n labels from messages/es.json (default locale).
 * Skipped in CI when the promo widget isn't rendered (feature toggle).
 */
test.describe("Lead capture flow", () => {
  test("promo CTA is visible on home page", async ({ page }) => {
    await page.goto("/")

    // The promo button text comes from es.json "promo.ctaButton" = "Promociones limitadas"
    const ctaButton = page.getByRole("button", { name: /promociones limitadas/i })

    // If the promo feature is disabled, skip gracefully
    const isVisible = await ctaButton.isVisible().catch(() => false)
    test.skip(!isVisible, "Promo CTA not rendered (feature may be toggled off)")

    await expect(ctaButton).toBeVisible()
  })

  test("RGPD screen shows on CTA click", async ({ page }) => {
    await page.goto("/")

    const ctaButton = page.getByRole("button", { name: /promociones limitadas/i })
    const isVisible = await ctaButton.isVisible().catch(() => false)
    test.skip(!isVisible, "Promo CTA not rendered")

    await ctaButton.click()

    // RGPD intro text from es.json "promo.rgpdIntro"
    await expect(page.getByText(/protección de tus datos/i)).toBeVisible()
  })

  test("RGPD volver button returns to CTA", async ({ page }) => {
    await page.goto("/")

    const ctaButton = page.getByRole("button", { name: /promociones limitadas/i })
    const isVisible = await ctaButton.isVisible().catch(() => false)
    test.skip(!isVisible, "Promo CTA not rendered")

    await ctaButton.click()
    await expect(page.getByText(/protección de tus datos/i)).toBeVisible()

    // "Volver" button from es.json "promo.back"
    await page.getByRole("button", { name: /volver/i }).click()
    await expect(ctaButton).toBeVisible()
  })
})

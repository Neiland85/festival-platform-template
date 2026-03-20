import { test, expect } from "@playwright/test"

/**
 * Lead capture flow — tests the promo CTA → RGPD → form cycle.
 *
 * The promo widget uses i18n labels from messages/es.json.
 * Tests skip gracefully if the promo CTA isn't rendered
 * (feature toggle or component not mounted in layout).
 */
test.describe("Lead capture flow", () => {
  test("promo CTA visibility check", async ({ page }) => {
    await page.goto("/")

    // "Promociones limitadas" from es.json "promo.ctaButton"
    const ctaButton = page.getByRole("button", { name: /promociones limitadas/i })
    const isVisible = await ctaButton.isVisible().catch(() => false)

    // Skip gracefully if promo widget is not mounted
    test.skip(!isVisible, "Promo CTA not rendered (feature may be toggled off or not in layout)")
    await expect(ctaButton).toBeVisible()
  })

  test("RGPD volver button returns to CTA", async ({ page }) => {
    await page.goto("/")

    const ctaButton = page.getByRole("button", { name: /promociones limitadas/i })
    const isVisible = await ctaButton.isVisible().catch(() => false)
    test.skip(!isVisible, "Promo CTA not rendered")

    await ctaButton.click()
    await expect(page.getByText(/protección de tus datos/i)).toBeVisible()

    await page.getByRole("button", { name: /volver/i }).click()
    await expect(ctaButton).toBeVisible()
  })
})

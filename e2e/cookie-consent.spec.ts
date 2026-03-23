import { test, expect } from "@playwright/test"

test.describe("Cookie Consent Banner", () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies before each test
    await context.clearCookies()
  })

  test("shows banner on first visit", async ({ page }) => {
    await page.goto("/es")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole("button", { name: /aceptar/i })).toBeVisible()
    await expect(banner.getByRole("button", { name: /rechazar/i })).toBeVisible()
  })

  test("accept sets cookie and dismisses banner", async ({ page, context }) => {
    await page.goto("/es")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    await banner.getByRole("button", { name: /aceptar/i }).click()

    // Banner should disappear
    await expect(banner).not.toBeVisible()

    // Cookie should be set
    const cookies = await context.cookies()
    const consent = cookies.find((c) => c.name === "sn_cookie_consent")
    expect(consent).toBeDefined()
    expect(consent!.value).toBe("accepted")
  })

  test("reject sets cookie and dismisses banner (opt-out)", async ({ page, context }) => {
    await page.goto("/es")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    await banner.getByRole("button", { name: /rechazar/i }).click()

    await expect(banner).not.toBeVisible()

    const cookies = await context.cookies()
    const consent = cookies.find((c) => c.name === "sn_cookie_consent")
    expect(consent).toBeDefined()
    expect(consent!.value).toBe("rejected")
  })

  test("banner stays dismissed on subsequent page loads", async ({ page }) => {
    await page.goto("/es")
    await page.getByRole("dialog", { name: /cookie/i })
      .getByRole("button", { name: /aceptar/i })
      .click()

    // Navigate to another page
    await page.goto("/es")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    await expect(banner).not.toBeVisible()
  })

  test("banner works in English locale", async ({ page }) => {
    await page.goto("/en")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole("button", { name: /accept/i })).toBeVisible()
    await expect(banner.getByRole("button", { name: /reject/i })).toBeVisible()
  })

  test("privacy policy link navigates correctly", async ({ page }) => {
    await page.goto("/es")
    const banner = page.getByRole("dialog", { name: /cookie/i })
    const link = banner.getByRole("link", { name: /privacidad/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", /privacidad/)
  })

  test("banner has correct ARIA role and label for screen readers", async ({ page }) => {
    await page.goto("/es")
    const banner = page.getByRole("dialog")
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute("aria-label")
  })
})

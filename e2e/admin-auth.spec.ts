import { test, expect } from "@playwright/test"

test.describe("Admin authentication", () => {
  test("redirects /dashboard to /login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page renders form", async ({ page }) => {
    await page.goto("/login")
    // Login page should have at least one input and a submit button
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
  })

  test("shows error or stays on login with wrong password", async ({ page }) => {
    await page.goto("/login")
    const input = page.locator("input").first()
    await input.fill("wrong-password-12345")

    const submitBtn = page.locator('button[type="submit"], button').first()
    await submitBtn.click()

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/)
  })
})

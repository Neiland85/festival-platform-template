import { test, expect } from "@playwright/test"

test.describe("Admin authentication", () => {
  test("redirects /dashboard to /login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page renders password form", async ({ page }) => {
    await page.goto("/login")
    // Password input with id="password"
    const passwordInput = page.locator("#password")
    await expect(passwordInput).toBeVisible()
    // Submit button says "entrar"
    const submitBtn = page.getByRole("button", { name: /entrar/i })
    await expect(submitBtn).toBeVisible()
  })

  test("shows error on wrong password", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#password").fill("wrong-password-12345")
    await page.getByRole("button", { name: /entrar/i }).click()

    // Should show error message and remain on login page
    await expect(page.getByText(/contraseña incorrecta|error/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})

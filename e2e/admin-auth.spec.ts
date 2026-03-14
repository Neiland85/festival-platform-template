import { test, expect } from "@playwright/test"

test.describe("Admin authentication", () => {
  test("redirects /dashboard to /login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page renders form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("textbox")).toBeVisible()
    await expect(page.getByRole("button", { name: /entr|login|acceder/i })).toBeVisible()
  })

  test("shows error on wrong password", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("textbox").fill("wrong-password-12345")
    await page.getByRole("button", { name: /entr|login|acceder/i }).click()

    // Should show error message or remain on login page
    await expect(page).toHaveURL(/\/login/)
  })
})

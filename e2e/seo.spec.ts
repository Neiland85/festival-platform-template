import { test, expect } from "@playwright/test"

/**
 * SEO essentials — validates meta tags on the home page.
 *
 * Note: robots.txt and sitemap.xml are NOT implemented yet
 * (no src/app/robots.ts or src/app/sitemap.ts).
 * Tests for those are skipped until they're added.
 */
test.describe("SEO essentials", () => {
  test("home page has meta description", async ({ page }) => {
    await page.goto("/")
    const meta = page.locator('meta[name="description"]')
    await expect(meta).toHaveAttribute("content", /.+/)
  })

  test("home page renders og:title meta tag", async ({ page }) => {
    await page.goto("/")
    const og = page.locator('meta[property="og:title"]')
    await expect(og).toHaveAttribute("content", /.+/)
  })

  test.skip("robots.txt is accessible", async ({ request }) => {
    // TODO: implement src/app/robots.ts
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
  })

  test.skip("sitemap.xml is accessible", async ({ request }) => {
    // TODO: implement src/app/sitemap.ts
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
  })
})

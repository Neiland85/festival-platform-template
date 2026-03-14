import { test, expect } from "@playwright/test"

test.describe("SEO essentials", () => {
  test("home page has meta description", async ({ page }) => {
    await page.goto("/")
    const meta = page.locator('meta[name="description"]')
    await expect(meta).toHaveAttribute("content", /.+/)
  })

  test("robots.txt is accessible", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain("User-agent")
  })

  test("sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain("urlset")
  })

  test("home page renders og:title meta tag", async ({ page }) => {
    await page.goto("/")
    const og = page.locator('meta[property="og:title"]')
    await expect(og).toHaveAttribute("content", /.+/)
  })
})

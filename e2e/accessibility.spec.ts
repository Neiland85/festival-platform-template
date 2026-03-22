import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

/**
 * Accessibility tests using axe-core via @axe-core/playwright.
 *
 * Run:
 *   pnpm exec playwright test --grep accessibility
 *   pnpm exec playwright test e2e/accessibility.spec.ts
 *
 * Install (if not present):
 *   pnpm add -D @axe-core/playwright
 */

test.describe("accessibility", () => {
  test.beforeEach(async ({ context }) => {
    // Accept cookies so the banner doesn't interfere with page audits
    await context.addCookies([
      {
        name: "sn_cookie_consent",
        value: "accepted",
        domain: "localhost",
        path: "/",
      },
    ])
  })

  test("homepage (ES) has no critical accessibility violations", async ({ page }) => {
    await page.goto("/es")
    await page.waitForLoadState("networkidle")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude(".sentry-error-embed") // Exclude Sentry overlay if present
      .analyze()

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    )

    if (critical.length > 0) {
      const summary = critical.map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instance(s))`,
      )
      console.error("Accessibility violations:\n" + summary.join("\n"))
    }

    expect(critical).toHaveLength(0)
  })

  test("homepage (EN) has no critical accessibility violations", async ({ page }) => {
    await page.goto("/en")
    await page.waitForLoadState("networkidle")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    )

    expect(critical).toHaveLength(0)
  })

  test("privacy page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/es/privacidad")
    await page.waitForLoadState("networkidle")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    )

    expect(critical).toHaveLength(0)
  })

  test("cookie banner meets accessibility requirements", async ({ page, context }) => {
    // Clear the cookie so banner appears
    await context.clearCookies()
    await page.goto("/es")

    const banner = page.getByRole("dialog")
    await expect(banner).toBeVisible()

    // Run axe only on the cookie banner
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    expect(results.violations).toHaveLength(0)

    // Verify focus management: buttons should be focusable
    const acceptBtn = banner.getByRole("button", { name: /aceptar/i })
    await acceptBtn.focus()
    await expect(acceptBtn).toBeFocused()
  })

  test("all images have alt text", async ({ page }) => {
    await page.goto("/es")
    await page.waitForLoadState("networkidle")

    const images = page.locator("img")
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute("alt")
      const src = await img.getAttribute("src")
      // Every img must have an alt attribute (can be empty for decorative)
      expect(alt, `Image ${src} missing alt attribute`).not.toBeNull()
    }
  })

  test("interactive elements are keyboard-accessible", async ({ page }) => {
    await page.goto("/es")
    await page.waitForLoadState("networkidle")

    // Tab through the page and verify focus is visible
    const focusableSelector =
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const elements = page.locator(focusableSelector)
    const count = await elements.count()

    // At least some focusable elements should exist
    expect(count).toBeGreaterThan(0)

    // Verify first few elements are reachable via Tab
    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.keyboard.press("Tab")
      const focused = page.locator(":focus")
      await expect(focused).toBeVisible()
    }
  })

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/es")
    await page.waitForLoadState("networkidle")

    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all()

    // Must have exactly one h1
    const h1s = await page.locator("h1").count()
    expect(h1s, "Page should have exactly one h1").toBe(1)

    // Heading levels should not skip (h1 → h3 without h2)
    let prevLevel = 0
    for (const heading of headings) {
      const tag = await heading.evaluate((el) => el.tagName.toLowerCase())
      const level = parseInt(tag.replace("h", ""), 10)
      // Heading level should not jump more than 1 level deeper
      if (prevLevel > 0) {
        expect(
          level,
          `Heading hierarchy skips from h${prevLevel} to h${level}`,
        ).toBeLessThanOrEqual(prevLevel + 1)
      }
      prevLevel = level
    }
  })
})

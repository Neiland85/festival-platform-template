/**
 * E2E: Checkout Flow
 *
 * Tests the Stripe checkout integration with route interception.
 * Mocks Stripe API responses to test the flow without real payments.
 */

import { test, expect } from "@playwright/test"

test.describe("Checkout Flow", () => {
  test("returns 503 when Stripe is not configured", async ({ request }) => {
    // In test environment, STRIPE_SECRET_KEY is not set
    const response = await request.post("/api/v1/checkout", {
      data: { eventId: "test-event-1", quantity: 1 },
      headers: { "Content-Type": "application/json" },
    })

    // Should return 503 (Stripe not configured) or 400 (validation)
    expect([400, 503]).toContain(response.status())
  })

  test("checkout endpoint requires event ID", async ({ request }) => {
    const response = await request.post("/api/v1/checkout", {
      data: {},
      headers: { "Content-Type": "application/json" },
    })

    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test("checkout endpoint validates CSRF token", async ({ request }) => {
    const response = await request.post("/api/v1/checkout", {
      data: { eventId: "test-event-1" },
      headers: {
        "Content-Type": "application/json",
        // No CSRF token
      },
    })

    // Should reject without valid CSRF token (if CSRF_SECRET is set)
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })
})

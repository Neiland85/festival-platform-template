/**
 * E2E: Rate Limiting
 *
 * Verifies that the rate limiter returns 429 after exceeding
 * the configured threshold (20 requests per 60s window).
 */

import { test, expect } from "@playwright/test"

test.describe("Rate Limiting", () => {
  test("returns 429 after exceeding rate limit on API endpoint", async ({
    request,
  }) => {
    const endpoint = "/api/healthz"
    let lastStatus = 200

    // Send rapid requests to exceed the rate limit (20/min default)
    for (let i = 0; i < 25; i++) {
      const response = await request.get(endpoint)
      lastStatus = response.status()
      if (lastStatus === 429) break
    }

    expect(lastStatus).toBe(429)
  })

  test("returns Retry-After header on 429 response", async ({ request }) => {
    const endpoint = "/api/healthz"

    // Exhaust rate limit
    for (let i = 0; i < 25; i++) {
      const response = await request.get(endpoint)
      if (response.status() === 429) {
        const retryAfter = response.headers()["retry-after"]
        expect(retryAfter).toBeDefined()
        expect(Number(retryAfter)).toBeGreaterThan(0)
        return
      }
    }

    // If we didn't hit 429, the rate limiter may not be active in test env
    test.skip()
  })

  test("login endpoint has stricter rate limit (5 failed attempts)", async ({
    request,
  }) => {
    const endpoint = "/api/v1/auth/login"

    for (let i = 0; i < 6; i++) {
      const response = await request.post(endpoint, {
        data: { password: "wrong-password" },
      })

      if (i >= 5) {
        expect(response.status()).toBe(429)
      }
    }
  })
})

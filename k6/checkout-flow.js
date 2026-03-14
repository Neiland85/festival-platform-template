import http from "k6/http"
import { check, sleep } from "k6"
import { BASE_URL, THRESHOLDS, LOAD_STAGES, defaultHeaders } from "./config.js"

/**
 * Checkout flow load test
 *
 * Simulates users initiating ticket purchases via POST /api/v1/checkout.
 * Tests order creation, event capacity validation, and Stripe session creation.
 *
 * Note: This test hits the checkout API but does NOT complete Stripe payment.
 * Expected responses:
 *   - 200: Stripe session URL returned (Stripe configured)
 *   - 503: Stripe not configured (graceful degradation)
 *   - 400: Validation errors
 *   - 409: Capacity exceeded
 *
 * Run:
 *   k6 run k6/checkout-flow.js
 *   k6 run -e EVENT_ID=chambao k6/checkout-flow.js
 */

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    "http_req_duration{endpoint:checkout}": ["p(95)<800"],
  },
  tags: { test: "checkout-flow" },
}

const EVENT_ID = __ENV.EVENT_ID || "chambao"

export default function () {
  const headers = defaultHeaders()
  const email = `buyer-${__VU}-${__ITER}@loadtest.example`

  // Step 1: Load events API to simulate browsing
  const eventsRes = http.get(`${BASE_URL}/api/v1/events`, {
    headers,
    tags: { endpoint: "events-list" },
  })

  check(eventsRes, {
    "events list status 200": (r) => r.status === 200,
  })

  sleep(1) // User browses events

  // Step 2: Initiate checkout
  const checkoutPayload = JSON.stringify({
    eventId: EVENT_ID,
    email: email,
    quantity: 1,
    locale: "es",
  })

  const checkoutRes = http.post(
    `${BASE_URL}/api/v1/checkout`,
    checkoutPayload,
    {
      headers,
      tags: { endpoint: "checkout" },
    },
  )

  check(checkoutRes, {
    "checkout returns expected status": (r) =>
      [200, 400, 404, 409, 503].includes(r.status),
    "checkout returns URL or expected error": (r) => {
      try {
        const body = JSON.parse(r.body)
        // 200 → Stripe URL, 503 → payment not configured, 4xx → validation
        return body.url !== undefined || body.error !== undefined
      } catch {
        return false
      }
    },
  })

  // Step 3: Attempt multi-ticket purchase (quantity 2-5)
  const multiPayload = JSON.stringify({
    eventId: EVENT_ID,
    email: email,
    quantity: Math.floor(Math.random() * 4) + 2, // 2-5 tickets
    locale: "en",
  })

  const multiRes = http.post(`${BASE_URL}/api/v1/checkout`, multiPayload, {
    headers,
    tags: { endpoint: "checkout_multi" },
  })

  check(multiRes, {
    "multi-ticket checkout returns expected status": (r) =>
      [200, 400, 404, 409, 503].includes(r.status),
  })

  // Simulate user decision time
  sleep(Math.random() * 5 + 3) // 3-8 seconds
}

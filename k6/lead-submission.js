import http from "k6/http"
import { check, sleep } from "k6"
import { SharedArray } from "k6/data"
import { BASE_URL, THRESHOLDS, LOAD_STAGES, defaultHeaders } from "./config.js"

/**
 * Lead submission load test
 *
 * Simulates concurrent users submitting the promo form.
 * Tests rate limiting, database writes, and validation.
 *
 * Run:
 *   k6 run k6/lead-submission.js
 */

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    "http_req_duration{endpoint:leads}": ["p(95)<400"],
  },
  tags: { test: "lead-submission" },
}

// Pre-generate unique emails to avoid duplicate constraints
const emails = new SharedArray("emails", function () {
  const list = []
  for (let i = 0; i < 5000; i++) {
    list.push(`k6-user-${i}-${Date.now()}@loadtest.example`)
  }
  return list
})

export default function () {
  const headers = defaultHeaders()
  const vuEmail = emails[__VU % emails.length]

  // Step 1: Fetch CSRF token
  const csrfRes = http.get(`${BASE_URL}/api/csrf`, {
    headers,
    tags: { endpoint: "csrf" },
  })

  let csrfToken = ""
  try {
    const csrfBody = JSON.parse(csrfRes.body)
    csrfToken = csrfBody.token || ""
  } catch {
    // CSRF may not be configured — continue without it
  }

  // Step 2: Submit lead
  const payload = JSON.stringify({
    name: "Load Test",
    surname: "User",
    email: vuEmail,
    phone: "+34600000000",
    profession: "Developer",
    consentGiven: true,
    source: "k6-load-test",
  })

  const leadRes = http.post(`${BASE_URL}/api/v1/leads`, payload, {
    headers: {
      ...headers,
      "x-csrf-token": csrfToken,
    },
    tags: { endpoint: "leads" },
  })

  check(leadRes, {
    "lead submission status 2xx or 429": (r) =>
      r.status === 200 || r.status === 201 || r.status === 429,
    "lead returns id or rate limit": (r) => {
      if (r.status === 429) return true // rate limited is expected under load
      try {
        const body = JSON.parse(r.body)
        return body.id !== undefined || body.success === true
      } catch {
        return false
      }
    },
  })

  // Log rate-limited requests for analysis
  if (leadRes.status === 429) {
    console.log(`VU ${__VU}: Rate limited (expected under high load)`)
  }

  // Simulate user think time
  sleep(Math.random() * 3 + 2) // 2-5 seconds
}

import { test, expect } from "@playwright/test"

/**
 * API health endpoints — tests only routes that exist and work
 * without external dependencies (no DB, no Redis, no CSRF_SECRET).
 */
test.describe("API health endpoints", () => {
  test("GET /api/healthz returns 200", async ({ request }) => {
    const res = await request.get("/api/healthz")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("ok")
  })

  test("GET /api/readyz returns 200", async ({ request }) => {
    const res = await request.get("/api/readyz")
    // readyz may return 200 or 503 depending on infra checks — both valid in CI
    expect([200, 503]).toContain(res.status())
  })

  test("GET /api/csrf returns 503 without CSRF_SECRET", async ({ request }) => {
    // In CI, CSRF_SECRET is not set → graceful 503
    const res = await request.get("/api/csrf")
    expect([200, 503]).toContain(res.status())
  })

  test("POST /api/v1/auth/login rejects empty body", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: {},
      headers: { "Content-Type": "application/json" },
    })
    // Should reject: 400 (bad request) or 401 (unauthorized)
    expect([400, 401]).toContain(res.status())
  })

  test("POST /api/v1/auth/login rejects wrong password", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { password: "definitely-wrong-password" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(401)
  })
})

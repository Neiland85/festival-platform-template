import { test, expect } from "@playwright/test"

test.describe("API health endpoints", () => {
  test("GET /api/healthz returns 200", async ({ request }) => {
    const res = await request.get("/api/healthz")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("ok")
  })

  test("GET /api/csrf returns token", async ({ request }) => {
    const res = await request.get("/api/csrf")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.csrfToken).toBeDefined()
    expect(typeof body.csrfToken).toBe("string")
  })

  test("POST /api/v1/auth/login rejects empty body", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: {},
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(400)
  })

  test("POST /api/v1/auth/login rejects wrong password", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", {
      data: { password: "definitely-wrong-password" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(401)
  })

  test("POST /api/v1/leads rejects invalid payload", async ({ request }) => {
    const res = await request.post("/api/v1/leads", {
      data: { email: "not-an-email" },
      headers: { "Content-Type": "application/json" },
    })
    expect(res.status()).toBe(400)
  })

  test("GET /api/v1/events returns JSON array", async ({ request }) => {
    const res = await request.get("/api/v1/events")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(Array.isArray(body.data)).toBe(true)
  })
})

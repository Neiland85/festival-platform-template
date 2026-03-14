import { describe, it, expect, vi } from "vitest"
import { GET } from "./route"

// ── Mock DB pool ────────────────────────────────────

const mockQuery = vi.fn()

vi.mock("@/adapters/db/pool", () => ({
  getPool: () => ({ query: mockQuery }),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

describe("GET /api/readyz", () => {
  it("returns 200 when DB is reachable", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.status).toBe("ready")
    expect(json.db).toBe("connected")
  })

  it("returns 503 when DB is unreachable", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"))

    const res = await GET()
    expect(res.status).toBe(503)

    const json = await res.json()
    expect(json.status).toBe(503)
    expect(json.title).toBe("Service Unavailable")
  })
})

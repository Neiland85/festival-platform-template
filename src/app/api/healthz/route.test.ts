import { describe, it, expect } from "vitest"
import { GET } from "./route"

describe("GET /api/healthz", () => {
  it("returns 200 with status ok", async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.status).toBe("ok")
  })
})

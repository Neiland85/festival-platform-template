import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: vi.fn(),
}))
vi.mock("@/lib/security/verifyCsrf", () => ({
  verifyCsrf: vi.fn(),
}))

import { requireAdmin } from "@/lib/auth/requireAdmin"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { POST } from "./route"

const params = { params: Promise.resolve({ id: "ord_x" }) }

function req() {
  return new NextRequest("http://localhost/api/orders/ord_x/ticket-asset/mint", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
}

describe("POST /api/orders/:id/ticket-asset/mint", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockReset()
    vi.mocked(verifyCsrf).mockReset()
  })

  it("returns 401 without admin session", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(false)
    const res = await POST(req(), params)
    expect(res.status).toBe(401)
    expect(verifyCsrf).not.toHaveBeenCalled()
  })

  it("returns 403 when CSRF fails", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(true)
    vi.mocked(verifyCsrf).mockReturnValue(false)
    const res = await POST(req(), params)
    expect(res.status).toBe(403)
  })
})

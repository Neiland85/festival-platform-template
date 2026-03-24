import crypto from "crypto"
import { describe, expect, it, vi } from "vitest"
import { createCsrfToken, verifyCsrfToken } from "./csrf"

describe("verifyCsrfToken", () => {
  const secret = "test-secret"
  const sessionId = "session-123"

  it("returns true for a valid token", () => {
    const token = createCsrfToken({ secret, sessionId })
    expect(verifyCsrfToken({ secret, token, sessionId })).toBe(true)
  })

  it("returns false for an invalid token", () => {
    const token = createCsrfToken({ secret, sessionId })
    const [sid = "", nonce = "", sig = ""] = token.split(".")
    const invalidSig = `${sig.slice(0, -1)}${sig.slice(-1) === "a" ? "b" : "a"}`
    const invalidToken = `${sid}.${nonce}.${invalidSig}`

    expect(verifyCsrfToken({ secret, token: invalidToken, sessionId })).toBe(false)
  })

  it("returns false when token is missing", () => {
    expect(verifyCsrfToken({ secret, token: "", sessionId })).toBe(false)
  })

  it("returns false and skips timingSafeEqual for different length signatures", () => {
    const timingSafeEqualSpy = vi.spyOn(crypto, "timingSafeEqual")

    expect(
      verifyCsrfToken({
        secret,
        token: `${sessionId}.nonce.short`,
        sessionId,
      }),
    ).toBe(false)

    expect(timingSafeEqualSpy).not.toHaveBeenCalled()
    timingSafeEqualSpy.mockRestore()
  })

  it("returns false for malformed input", () => {
    expect(
      verifyCsrfToken({
        secret,
        token: null as unknown as string,
        sessionId,
      }),
    ).toBe(false)
  })
})

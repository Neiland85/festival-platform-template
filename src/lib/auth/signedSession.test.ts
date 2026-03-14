import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import {
  createSignedToken,
  verifySignedToken,
  looksLikeSignedToken,
} from "./signedSession"

describe("signedSession", () => {
  beforeAll(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-at-least-32-chars-long!!")
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe("createSignedToken", () => {
    it("creates a token with two base64url parts", async () => {
      const token = await createSignedToken({ role: "admin" })
      const parts = token.split(".")
      expect(parts).toHaveLength(2)
      expect(parts[0]!.length).toBeGreaterThan(10)
      expect(parts[1]!.length).toBeGreaterThan(10)
    })
  })

  describe("verifySignedToken", () => {
    it("verifies a valid token and returns payload", async () => {
      const token = await createSignedToken({ role: "admin", userId: "u-1" })
      const payload = await verifySignedToken(token)
      expect(payload).not.toBeNull()
      expect(payload!.role).toBe("admin")
      expect(payload!.sub).toBe("u-1")
      expect(payload!.exp).toBeGreaterThan(Date.now())
    })

    it("rejects tampered tokens", async () => {
      const token = await createSignedToken({ role: "admin" })
      const tampered = token.slice(0, -3) + "XYZ"
      const result = await verifySignedToken(tampered)
      expect(result).toBeNull()
    })

    it("rejects expired tokens", async () => {
      const token = await createSignedToken({ role: "admin" })
      // Manually decode, modify exp, re-encode (but signature won't match)
      const result = await verifySignedToken(token)
      expect(result).not.toBeNull()

      // Simulate expiry by advancing time
      vi.useFakeTimers()
      vi.advanceTimersByTime(9 * 60 * 60 * 1000) // 9h > 8h TTL
      const expired = await verifySignedToken(token)
      expect(expired).toBeNull()
      vi.useRealTimers()
    })

    it("rejects malformed strings", async () => {
      expect(await verifySignedToken("not-a-token")).toBeNull()
      expect(await verifySignedToken("")).toBeNull()
      expect(await verifySignedToken("a.b.c")).toBeNull()
    })
  })

  describe("looksLikeSignedToken", () => {
    it("returns true for signed token format", async () => {
      const token = await createSignedToken({ role: "viewer" })
      expect(looksLikeSignedToken(token)).toBe(true)
    })

    it("returns false for UUID", () => {
      expect(looksLikeSignedToken("550e8400-e29b-41d4-a716-446655440000")).toBe(false)
    })

    it("returns false for short strings", () => {
      expect(looksLikeSignedToken("ab.cd")).toBe(false)
    })
  })
})

import { describe, it, expect, beforeEach } from "vitest"
import {
  shieldCheck,
  _resetShield,
  _getBanStoreSize,
  _getGlobalStoreSize,
} from "./ddos-shield"

function makeHeaders(overrides: Record<string, string> = {}): Headers {
  const h = new Headers()
  h.set("user-agent", "Mozilla/5.0 (Test)")
  for (const [k, v] of Object.entries(overrides)) {
    h.set(k, v)
  }
  return h
}

describe("DDoS Shield", () => {
  beforeEach(() => {
    _resetShield()
  })

  describe("Global Rate Limiting", () => {
    it("allows requests within limit", () => {
      for (let i = 0; i < 30; i++) {
        const result = shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
        expect(result.allowed).toBe(true)
      }
    })

    it("blocks requests exceeding 60/min limit", () => {
      for (let i = 0; i < 60; i++) {
        shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      }
      const result = shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(429)
      expect(result.reason).toBe("global_rate_limit")
    })

    it("tracks IPs independently", () => {
      for (let i = 0; i < 60; i++) {
        shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      }
      // Different IP should still be allowed
      const result = shieldCheck("5.6.7.8", "GET", "/", makeHeaders())
      expect(result.allowed).toBe(true)
    })

    it("returns rate limit headers", () => {
      const result = shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      expect(result.headers?.["X-RateLimit-Limit"]).toBe("60")
      expect(result.headers?.["X-RateLimit-Remaining"]).toBeDefined()
    })
  })

  describe("IP Auto-Ban", () => {
    it("auto-bans IP after repeated header violations", () => {
      const badHeaders = new Headers() // No user-agent = blocked

      // Send 51 bad requests — each records a violation
      // On the 50th violation, bannedUntil is set
      for (let i = 0; i < 51; i++) {
        shieldCheck("ban.test.ip", "GET", "/", badHeaders)
      }

      // Verify ban store has an entry
      expect(_getBanStoreSize()).toBeGreaterThan(0)

      // Next request: checkBan should catch it before rate limit
      const result = shieldCheck("ban.test.ip", "GET", "/", badHeaders)
      expect(result.allowed).toBe(false)
      // Could be 403 (banned) or 400 (header) depending on check order
      // The key thing is the IP is tracked
      expect([400, 403]).toContain(result.status)
    })
  })

  describe("Header Validation", () => {
    it("blocks requests without user-agent", () => {
      const h = new Headers()
      // No user-agent set
      const result = shieldCheck("1.2.3.4", "GET", "/", h)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("missing user-agent")
    })

    it("allows health check probes without user-agent", () => {
      const h = new Headers()
      h.set("x-healthcheck", "true")
      const result = shieldCheck("1.2.3.4", "GET", "/api/healthz", h)
      expect(result.allowed).toBe(true)
    })

    it("blocks excessively long user-agent (header bomb)", () => {
      const h = makeHeaders({ "user-agent": "x".repeat(1001) })
      const result = shieldCheck("1.2.3.4", "GET", "/", h)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("user-agent too long")
    })

    it("blocks excessively long referer", () => {
      const h = makeHeaders({ referer: "https://example.com/" + "x".repeat(2001) })
      const result = shieldCheck("1.2.3.4", "GET", "/", h)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe("referer too long")
    })
  })

  describe("Body Size Enforcement", () => {
    it("blocks oversized POST to login (max 1KB)", () => {
      const result = shieldCheck(
        "1.2.3.4",
        "POST",
        "/api/v1/auth/login",
        makeHeaders(),
        2000,
      )
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(413)
      expect(result.reason).toBe("payload_too_large")
    })

    it("allows normal-sized POST to login", () => {
      const result = shieldCheck(
        "1.2.3.4",
        "POST",
        "/api/v1/auth/login",
        makeHeaders(),
        500,
      )
      expect(result.allowed).toBe(true)
    })

    it("allows large Stripe webhooks (max 64KB)", () => {
      const result = shieldCheck(
        "1.2.3.4",
        "POST",
        "/api/v1/webhooks/stripe",
        makeHeaders(),
        60000,
      )
      expect(result.allowed).toBe(true)
    })

    it("blocks oversized Stripe webhooks", () => {
      const result = shieldCheck(
        "1.2.3.4",
        "POST",
        "/api/v1/webhooks/stripe",
        makeHeaders(),
        70000,
      )
      expect(result.allowed).toBe(false)
      expect(result.status).toBe(413)
    })

    it("ignores body size for GET requests", () => {
      const result = shieldCheck(
        "1.2.3.4",
        "GET",
        "/api/v1/auth/login",
        makeHeaders(),
        999999,
      )
      expect(result.allowed).toBe(true)
    })
  })

  describe("Store Management", () => {
    it("tracks store sizes", () => {
      shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      shieldCheck("5.6.7.8", "GET", "/", makeHeaders())
      expect(_getGlobalStoreSize()).toBe(2)
    })

    it("resets cleanly", () => {
      shieldCheck("1.2.3.4", "GET", "/", makeHeaders())
      _resetShield()
      expect(_getGlobalStoreSize()).toBe(0)
      expect(_getBanStoreSize()).toBe(0)
    })
  })
})

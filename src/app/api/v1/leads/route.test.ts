import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { _isValidIp, _getClientIp } from "./route"

describe("_isValidIp", () => {
  describe("IPv4 validation", () => {
    it("accepts valid IPv4 addresses", () => {
      expect(_isValidIp("192.168.1.1")).toBe(true)
      expect(_isValidIp("10.0.0.1")).toBe(true)
      expect(_isValidIp("172.16.0.1")).toBe(true)
      expect(_isValidIp("8.8.8.8")).toBe(true)
      expect(_isValidIp("255.255.255.255")).toBe(true)
      expect(_isValidIp("0.0.0.0")).toBe(true)
    })

    it("rejects invalid IPv4 addresses", () => {
      expect(_isValidIp("256.1.1.1")).toBe(false)
      expect(_isValidIp("1.256.1.1")).toBe(false)
      expect(_isValidIp("1.1.256.1")).toBe(false)
      expect(_isValidIp("1.1.1.256")).toBe(false)
      expect(_isValidIp("192.168.1")).toBe(false)
      expect(_isValidIp("192.168.1.1.1")).toBe(false)
      expect(_isValidIp("192.168.-1.1")).toBe(false)
    })
  })

  describe("IPv6 validation", () => {
    it("accepts valid IPv6 addresses", () => {
      expect(_isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true)
      expect(_isValidIp("2001:db8:85a3:0:0:8a2e:370:7334")).toBe(true)
      expect(_isValidIp("2001:db8:85a3::8a2e:370:7334")).toBe(true)
      expect(_isValidIp("::1")).toBe(true)
      expect(_isValidIp("fe80::")).toBe(true)
    })

    it("rejects invalid IPv6 addresses", () => {
      expect(_isValidIp("02001:0db8:0000:0000:0000:ff00:0042:8329")).toBe(false)
      expect(_isValidIp("2001:0db8:0000:0000:0000:gg00:0042:8329")).toBe(false)
    })
  })

  describe("malformed input", () => {
    it("rejects non-IP strings", () => {
      expect(_isValidIp("not-an-ip")).toBe(false)
      expect(_isValidIp("")).toBe(false)
      expect(_isValidIp("unknown")).toBe(false)
      expect(_isValidIp("localhost")).toBe(false)
    })
  })
})

describe("_getClientIp", () => {
  function createMockRequest(headers: Record<string, string>): NextRequest {
    const req = new NextRequest("https://example.com/api/v1/leads", {
      method: "POST",
      headers: new Headers(headers),
    })
    return req
  }

  describe("x-real-ip header", () => {
    it("prefers x-real-ip when present and valid", () => {
      const req = createMockRequest({
        "x-real-ip": "203.0.113.42",
        "x-forwarded-for": "198.51.100.1, 192.0.2.1",
      })
      expect(_getClientIp(req)).toBe("203.0.113.42")
    })

    it("ignores x-real-ip when invalid", () => {
      const req = createMockRequest({
        "x-real-ip": "invalid-ip",
        "x-forwarded-for": "198.51.100.1",
      })
      expect(_getClientIp(req)).toBe("198.51.100.1")
    })

    it("trims whitespace from x-real-ip", () => {
      const req = createMockRequest({
        "x-real-ip": "  203.0.113.42  ",
      })
      expect(_getClientIp(req)).toBe("203.0.113.42")
    })
  })

  describe("x-forwarded-for header", () => {
    it("uses first IP from x-forwarded-for when x-real-ip absent", () => {
      const req = createMockRequest({
        "x-forwarded-for": "198.51.100.1, 192.0.2.1, 203.0.113.42",
      })
      expect(_getClientIp(req)).toBe("198.51.100.1")
    })

    it("ignores invalid first IP in x-forwarded-for", () => {
      const req = createMockRequest({
        "x-forwarded-for": "invalid, 192.0.2.1",
      })
      expect(_getClientIp(req)).toBe("unknown")
    })

    it("trims whitespace from x-forwarded-for", () => {
      const req = createMockRequest({
        "x-forwarded-for": "  198.51.100.1  , 192.0.2.1",
      })
      expect(_getClientIp(req)).toBe("198.51.100.1")
    })

    it("handles single IP in x-forwarded-for", () => {
      const req = createMockRequest({
        "x-forwarded-for": "198.51.100.1",
      })
      expect(_getClientIp(req)).toBe("198.51.100.1")
    })
  })

  describe("IPv6 support", () => {
    it("accepts IPv6 from x-real-ip", () => {
      const req = createMockRequest({
        "x-real-ip": "2001:db8::1",
      })
      expect(_getClientIp(req)).toBe("2001:db8::1")
    })

    it("accepts IPv6 from x-forwarded-for", () => {
      const req = createMockRequest({
        "x-forwarded-for": "2001:db8::1, 2001:db8::2",
      })
      expect(_getClientIp(req)).toBe("2001:db8::1")
    })
  })

  describe("fallback behavior", () => {
    it("returns 'unknown' when no headers present", () => {
      const req = createMockRequest({})
      expect(_getClientIp(req)).toBe("unknown")
    })

    it("returns 'unknown' when headers are empty strings", () => {
      const req = createMockRequest({
        "x-real-ip": "",
        "x-forwarded-for": "",
      })
      expect(_getClientIp(req)).toBe("unknown")
    })

    it("returns 'unknown' when all IPs are invalid", () => {
      const req = createMockRequest({
        "x-real-ip": "not-valid",
        "x-forwarded-for": "also-not-valid",
      })
      expect(_getClientIp(req)).toBe("unknown")
    })
  })

  describe("spoofing prevention", () => {
    it("validates IP format to prevent spoofing", () => {
      const req = createMockRequest({
        "x-forwarded-for": "attacker-controlled-value",
      })
      expect(_getClientIp(req)).toBe("unknown")
    })

    it("only uses first IP from comma-separated list", () => {
      const req = createMockRequest({
        "x-forwarded-for": "198.51.100.1, 192.0.2.1",
      })
      // Should not match the full string "198.51.100.1, 192.0.2.1"
      expect(_getClientIp(req)).toBe("198.51.100.1")
    })
  })
})

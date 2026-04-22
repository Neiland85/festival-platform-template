/**
 * Memory domain tests — pure functions, no mocks.
 */

import { describe, it, expect } from "vitest"
import { isExpired, validateCategory, computeExpiresAt } from "./memory"

const NOW = new Date("2026-03-31T12:00:00Z")

describe("isExpired", () => {
  it("returns false when expiresAt is null (no TTL)", () => {
    expect(isExpired(null, NOW)).toBe(false)
  })

  it("returns false when expiresAt is in the future", () => {
    const future = new Date(NOW.getTime() + 60000)
    expect(isExpired(future, NOW)).toBe(false)
  })

  it("returns true when expiresAt is in the past", () => {
    const past = new Date(NOW.getTime() - 1)
    expect(isExpired(past, NOW)).toBe(true)
  })

  it("returns true when expiresAt equals now", () => {
    expect(isExpired(NOW, NOW)).toBe(true)
  })
})

describe("validateCategory", () => {
  it("accepts valid categories", () => {
    expect(validateCategory("scoring")).toBe("scoring")
    expect(validateCategory("segments")).toBe("segments")
    expect(validateCategory("planning")).toBe("planning")
    expect(validateCategory("general")).toBe("general")
  })

  it("throws for invalid categories", () => {
    expect(() => validateCategory("invalid")).toThrow("Invalid memory category")
    expect(() => validateCategory("")).toThrow("Invalid memory category")
  })
})

describe("computeExpiresAt", () => {
  it("adds TTL seconds to now", () => {
    const result = computeExpiresAt(3600, NOW) // 1 hour
    expect(result.getTime()).toBe(NOW.getTime() + 3600000)
  })

  it("handles small TTL", () => {
    const result = computeExpiresAt(60, NOW) // 1 minute
    expect(result.getTime()).toBe(NOW.getTime() + 60000)
  })

  it("handles large TTL (30 days)", () => {
    const result = computeExpiresAt(2592000, NOW)
    expect(result.getTime()).toBe(NOW.getTime() + 2592000000)
  })
})

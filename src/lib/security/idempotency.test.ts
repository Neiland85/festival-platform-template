import { describe, it, expect, beforeEach } from "vitest"
import {
  checkIdempotencyKey,
  isValidIdempotencyKey,
  _resetIdempotencyStore,
} from "./idempotency"

describe("idempotency", () => {
  beforeEach(() => {
    _resetIdempotencyStore()
  })

  describe("isValidIdempotencyKey", () => {
    it("accepts valid UUID v4", () => {
      expect(isValidIdempotencyKey("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    })

    it("rejects non-UUID strings", () => {
      expect(isValidIdempotencyKey("not-a-uuid")).toBe(false)
      expect(isValidIdempotencyKey("")).toBe(false)
      expect(isValidIdempotencyKey("12345")).toBe(false)
    })
  })

  describe("checkIdempotencyKey", () => {
    const key = "550e8400-e29b-41d4-a716-446655440000"

    it("returns false for first occurrence (not duplicate)", async () => {
      expect(await checkIdempotencyKey(key)).toBe(false)
    })

    it("returns true for second occurrence (duplicate)", async () => {
      await checkIdempotencyKey(key)
      expect(await checkIdempotencyKey(key)).toBe(true)
    })

    it("handles different keys independently", async () => {
      const key2 = "660e8400-e29b-41d4-a716-446655440001"
      await checkIdempotencyKey(key)
      expect(await checkIdempotencyKey(key2)).toBe(false)
    })
  })
})

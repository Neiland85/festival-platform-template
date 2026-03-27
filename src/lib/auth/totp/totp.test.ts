import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { generateTOTPSecret, verifyTOTP, generateCurrentToken } from "./totp"
import { _resetKeyCache } from "@/lib/crypto/aes256gcm"

describe("TOTP 2FA", () => {
  beforeEach(() => {
    _resetKeyCache()
    process.env["ENCRYPTION_KEY"] = "test-encryption-key-must-be-at-least-32-chars-long"
  })

  afterEach(() => {
    _resetKeyCache()
    delete process.env["ENCRYPTION_KEY"]
  })

  it("generates a TOTP setup with secret, URI, and encrypted secret", () => {
    const setup = generateTOTPSecret("admin@festival.com")
    expect(setup.secret).toBeTruthy()
    expect(setup.secret.length).toBeGreaterThan(10)
    expect(setup.uri).toContain("otpauth://totp/")
    expect(setup.uri).toContain("FestivalPlatform")
    expect(setup.uri).toContain("admin%40festival.com")
    expect(setup.encryptedSecret).toBeTruthy()
    expect(setup.encryptedSecret).not.toBe(setup.secret)
  })

  it("verifies a valid current token", () => {
    const setup = generateTOTPSecret("test@example.com")
    const token = generateCurrentToken(setup.encryptedSecret)
    expect(token).toHaveLength(6)
    expect(verifyTOTP(token, setup.encryptedSecret)).toBe(true)
  })

  it("rejects an invalid token", () => {
    const setup = generateTOTPSecret("test@example.com")
    expect(verifyTOTP("000000", setup.encryptedSecret)).toBe(false)
  })

  it("rejects empty token", () => {
    const setup = generateTOTPSecret("test@example.com")
    expect(verifyTOTP("", setup.encryptedSecret)).toBe(false)
  })

  it("rejects token with wrong length", () => {
    const setup = generateTOTPSecret("test@example.com")
    expect(verifyTOTP("12345", setup.encryptedSecret)).toBe(false)
    expect(verifyTOTP("1234567", setup.encryptedSecret)).toBe(false)
  })

  it("encrypts secret differently each time", () => {
    const s1 = generateTOTPSecret("user1@test.com")
    const s2 = generateTOTPSecret("user2@test.com")
    expect(s1.encryptedSecret).not.toBe(s2.encryptedSecret)
  })

  it("generates unique secrets per user", () => {
    const s1 = generateTOTPSecret("user1@test.com")
    const s2 = generateTOTPSecret("user2@test.com")
    expect(s1.secret).not.toBe(s2.secret)
  })
})

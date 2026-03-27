import { describe, it, expect, beforeEach } from "vitest"
import {
  generateTotpSecret,
  verifyTotpToken,
  verifyBackupCode,
  _generateTokenForTesting,
} from "./totp-service"

describe("TOTP Two-Factor Authentication", () => {
  beforeEach(() => {
    process.env["SESSION_SECRET"] = "test-secret-minimum-32-characters-long-for-totp-testing"
  })

  describe("generateTotpSecret", () => {
    it("generates all required components", async () => {
      const result = await generateTotpSecret("admin@festival.com")

      expect(result.secret).toBeDefined()
      expect(result.secret.length).toBeGreaterThan(10)
      expect(result.encryptedSecret).toBeDefined()
      expect(result.otpauthUri).toContain("otpauth://totp/")
      expect(result.otpauthUri).toContain("FestivalPlatform")
      expect(result.qrCodeDataUrl).toContain("data:image/png;base64,")
      expect(result.backupCodes).toHaveLength(10)
      expect(result.hashedBackupCodes).toHaveLength(10)
    })

    it("generates unique secrets each time", async () => {
      const r1 = await generateTotpSecret("admin@test.com")
      const r2 = await generateTotpSecret("admin@test.com")
      expect(r1.secret).not.toBe(r2.secret)
    })

    it("backup codes are 8 hex characters", async () => {
      const result = await generateTotpSecret("admin@test.com")
      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[0-9A-F]{8}$/)
      }
    })

    it("hashed backup codes are SHA-256 hex", async () => {
      const result = await generateTotpSecret("admin@test.com")
      for (const hash of result.hashedBackupCodes) {
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
      }
    })

    it("accepts custom issuer", async () => {
      const result = await generateTotpSecret("admin@test.com", "MyFestival")
      expect(result.otpauthUri).toContain("MyFestival")
    })
  })

  describe("verifyTotpToken", () => {
    it("verifies a valid TOTP token", async () => {
      const result = await generateTotpSecret("admin@test.com")
      const validToken = _generateTokenForTesting(result.secret)

      const isValid = verifyTotpToken(validToken, result.encryptedSecret)
      expect(isValid).toBe(true)
    })

    it("rejects wrong tokens", async () => {
      const result = await generateTotpSecret("admin@test.com")
      // Try a known-bad token (unlikely to match)
      expect(verifyTotpToken("000000", result.encryptedSecret)).toBe(false)
    })

    it("rejects non-6-digit tokens", async () => {
      const result = await generateTotpSecret("admin@test.com")
      expect(verifyTotpToken("12345", result.encryptedSecret)).toBe(false)
      expect(verifyTotpToken("1234567", result.encryptedSecret)).toBe(false)
      expect(verifyTotpToken("abcdef", result.encryptedSecret)).toBe(false)
    })

    it("rejects empty inputs", () => {
      expect(verifyTotpToken("", "encrypted")).toBe(false)
      expect(verifyTotpToken("123456", "")).toBe(false)
    })
  })

  describe("verifyBackupCode", () => {
    it("verifies a valid backup code", async () => {
      const result = await generateTotpSecret("admin@test.com")
      const code = result.backupCodes[0]!
      const index = verifyBackupCode(code, result.hashedBackupCodes)
      expect(index).toBe(0)
    })

    it("is case-insensitive", async () => {
      const result = await generateTotpSecret("admin@test.com")
      const code = result.backupCodes[0]!.toLowerCase()
      const index = verifyBackupCode(code, result.hashedBackupCodes)
      expect(index).toBe(0)
    })

    it("returns -1 for invalid code", async () => {
      const result = await generateTotpSecret("admin@test.com")
      expect(verifyBackupCode("XXXXXXXX", result.hashedBackupCodes)).toBe(-1)
    })

    it("returns -1 for empty inputs", () => {
      expect(verifyBackupCode("", [])).toBe(-1)
    })
  })
})

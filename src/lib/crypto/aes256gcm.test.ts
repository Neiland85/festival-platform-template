import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { encrypt, decrypt, _resetKeyCache } from "./aes256gcm"

describe("AES-256-GCM", () => {
  beforeEach(() => {
    _resetKeyCache()
    process.env["ENCRYPTION_KEY"] = "test-encryption-key-must-be-at-least-32-chars-long"
  })

  afterEach(() => {
    _resetKeyCache()
    delete process.env["ENCRYPTION_KEY"]
  })

  it("encrypts and decrypts plaintext correctly", () => {
    const plaintext = "Hello, World! This is a secret message."
    const ciphertext = encrypt(plaintext)
    const result = decrypt(ciphertext)
    expect(result).toBe(plaintext)
  })

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const plaintext = "same input"
    const c1 = encrypt(plaintext)
    const c2 = encrypt(plaintext)
    expect(c1).not.toBe(c2)
  })

  it("detects tampered ciphertext", () => {
    const ciphertext = encrypt("sensitive data")
    const tampered = Buffer.from(ciphertext, "base64")
    tampered[tampered.length - 1] ^= 0xff // Flip last byte
    tampered[tampered.length - 1]! ^= 0xff // Flip last byte
    expect(() => decrypt(tampered.toString("base64"))).toThrow()
  })

  it("rejects too-short ciphertext", () => {
    expect(() => decrypt("AAAA")).toThrow("too short")
  })

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env["ENCRYPTION_KEY"]
    _resetKeyCache()
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be set")
  })

  it("throws when ENCRYPTION_KEY is too short", () => {
    process.env["ENCRYPTION_KEY"] = "short"
    _resetKeyCache()
    expect(() => encrypt("test")).toThrow("at least 32 characters")
  })

  it("handles empty string", () => {
    const ciphertext = encrypt("")
    expect(decrypt(ciphertext)).toBe("")
  })

  it("handles unicode", () => {
    const plaintext = "Contraseña secreta 🔐 特殊文字"
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })
})

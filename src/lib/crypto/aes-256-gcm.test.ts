import { describe, it, expect, beforeEach, vi } from "vitest"
import { encrypt, decrypt } from "./aes-256-gcm"

describe("AES-256-GCM Encryption", () => {
  beforeEach(() => {
    // Ensure we have a key for testing
    process.env["SESSION_SECRET"] = "test-secret-minimum-32-characters-long-for-testing"
  })

  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "my-totp-secret-key-abc123"
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertext for same plaintext (unique nonce)", () => {
    const plaintext = "same-input-different-output"
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toBe(encrypted2) // Random nonce
  })

  it("output is base64 encoded", () => {
    const encrypted = encrypt("test")
    expect(() => Buffer.from(encrypted, "base64")).not.toThrow()
  })

  it("detects tampered ciphertext", () => {
    const encrypted = encrypt("sensitive-data")

    // Tamper with the base64 content
    const decoded = Buffer.from(encrypted, "base64").toString("utf8")
    const parts = decoded.split(":")
    if (parts[1]) {
      parts[1] = "ff" + parts[1].slice(2) // Modify ciphertext
    }
    const tampered = Buffer.from(parts.join(":")).toString("base64")

    expect(() => decrypt(tampered)).toThrow()
  })

  it("handles unicode content", () => {
    const plaintext = "contraseña-secreta-🔐-clé-secrète"
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it("handles empty string", () => {
    const encrypted = encrypt("")
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe("")
  })

  it("throws on invalid encrypted format", () => {
    expect(() => decrypt("not-valid-base64-encrypted")).toThrow()
  })

  it("uses ENCRYPTION_KEY when available", () => {
    // 64-char hex string = 32 bytes = 256 bits
    process.env["ENCRYPTION_KEY"] = "a".repeat(64)

    const plaintext = "test-with-explicit-key"
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)

    delete process.env["ENCRYPTION_KEY"]
  })

  it("throws when no key is available", () => {
    const originalSecret = process.env["SESSION_SECRET"]
    delete process.env["SESSION_SECRET"]
    delete process.env["ENCRYPTION_KEY"]

    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY or SESSION_SECRET must be set")

    process.env["SESSION_SECRET"] = originalSecret
  })
})

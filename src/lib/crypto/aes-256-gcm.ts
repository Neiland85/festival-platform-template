/**
 * AES-256-GCM Encryption — Next-generation authenticated encryption.
 *
 * WHY AES-256-GCM:
 *   - 256-bit key = quantum-resistant (Grover's algorithm reduces to 128-bit)
 *   - GCM mode provides both confidentiality AND integrity (AEAD)
 *   - 96-bit nonce + 128-bit auth tag = tamper detection
 *   - NIST-approved, FIPS 140-2 compliant
 *   - Hardware-accelerated on modern CPUs (AES-NI)
 *
 * WHAT IT ENCRYPTS:
 *   - TOTP secrets (2FA authenticator keys)
 *   - Sensitive configuration values
 *   - PII fields requiring encryption at rest
 *
 * FORMAT: base64(nonce:ciphertext:authTag)
 *   - nonce: 12 bytes (96 bits) — unique per encryption
 *   - ciphertext: variable length
 *   - authTag: 16 bytes (128 bits) — integrity verification
 *
 * KEY DERIVATION:
 *   Uses ENCRYPTION_KEY from environment (32-byte hex string).
 *   Falls back to SHA-256 hash of SESSION_SECRET if not set.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const NONCE_LENGTH = 12    // 96 bits (GCM standard)
const AUTH_TAG_LENGTH = 16 // 128 bits
const SEPARATOR = ":"

/**
 * Get the 256-bit encryption key.
 * Priority: ENCRYPTION_KEY env → SHA-256(SESSION_SECRET)
 */
function getKey(): Buffer {
  const explicit = process.env["ENCRYPTION_KEY"]
  if (explicit) {
    // Expect 64-char hex string (32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(explicit)) {
      return Buffer.from(explicit, "hex")
    }
    // Hash arbitrary-length key to 256 bits
    return createHash("sha256").update(explicit).digest()
  }

  // Fallback: derive from SESSION_SECRET
  const sessionSecret = process.env["SESSION_SECRET"]
  if (!sessionSecret) {
    throw new Error(
      "ENCRYPTION_KEY or SESSION_SECRET must be set for AES-256-GCM encryption",
    )
  }

  return createHash("sha256").update(sessionSecret).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: base64(nonce:ciphertext:authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const nonce = randomBytes(NONCE_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, nonce, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Format: nonce:ciphertext:authTag (all hex-encoded)
  const combined = [
    nonce.toString("hex"),
    encrypted.toString("hex"),
    authTag.toString("hex"),
  ].join(SEPARATOR)

  return Buffer.from(combined).toString("base64")
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Throws if tampered, corrupted, or wrong key.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getKey()

  const combined = Buffer.from(encryptedBase64, "base64").toString("utf8")
  const parts = combined.split(SEPARATOR)

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format: expected nonce:ciphertext:authTag")
  }

  const [nonceHex, ciphertextHex, authTagHex] = parts as [string, string, string]

  const nonce = Buffer.from(nonceHex, "hex")
  const ciphertext = Buffer.from(ciphertextHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(`Invalid nonce length: ${nonce.length} (expected ${NONCE_LENGTH})`)
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: ${authTag.length} (expected ${AUTH_TAG_LENGTH})`)
  }

  const decipher = createDecipheriv(ALGORITHM, key, nonce, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

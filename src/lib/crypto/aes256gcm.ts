/**
 * AES-256-GCM Encryption — authenticated encryption for sensitive data at rest.
 *
 * Uses Node.js native `crypto` module with:
 * - 256-bit key derived from ENCRYPTION_KEY env var via PBKDF2
 * - 96-bit random IV per encryption (NIST recommended)
 * - 128-bit authentication tag (tamper detection)
 *
 * Output format: base64(iv:authTag:ciphertext)
 * Each encryption produces unique output even for identical plaintext.
 */

import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // 96 bits — NIST SP 800-38D recommended
const TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits
const PBKDF2_ITERATIONS = 100_000
const SALT = "festival-platform-kdf-salt-v1" // Static salt — key uniqueness comes from ENCRYPTION_KEY

/**
 * Derive a 256-bit key from the master secret using PBKDF2.
 * Cached per process to avoid re-deriving on every call.
 */
let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const masterKey = process.env["ENCRYPTION_KEY"]
  if (!masterKey || masterKey.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set and at least 32 characters")
  }

  cachedKey = pbkdf2Sync(masterKey, SALT, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512")
  return cachedKey
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Pack: iv + authTag + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString("base64")
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Returns original plaintext or throws on tampered/invalid data.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const packed = Buffer.from(ciphertext, "base64")

  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short")
  }

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}

/** Reset cached key (for testing) */
export function _resetKeyCache(): void {
  cachedKey = null
}

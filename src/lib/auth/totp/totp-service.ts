/**
 * TOTP Two-Factor Authentication Service — Pure Node.js implementation.
 *
 * Implements RFC 6238 (TOTP) / RFC 4226 (HOTP) using native crypto.
 * No external TOTP library dependencies.
 *
 * Compatible with:
 *   - Google Authenticator
 *   - Microsoft Authenticator
 *   - Authy, 1Password, Bitwarden
 *   - Any RFC 6238-compliant authenticator
 *
 * SECURITY:
 *   - 160-bit secrets (20 bytes, base32 encoded)
 *   - 6-digit codes, 30-second window, ±1 step tolerance
 *   - Secrets encrypted at rest via AES-256-GCM
 *   - Backup codes: 10 single-use, SHA-256 hashed
 */

import { createHmac, randomBytes, createHash } from "node:crypto"
import * as QRCode from "qrcode"
import { encrypt, decrypt } from "@/lib/crypto/aes-256-gcm"

const DIGITS = 6
const PERIOD = 30  // seconds
const WINDOW = 1   // ±1 step tolerance for clock skew

// ── Base32 Encoding/Decoding (RFC 4648) ──────────────

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Encode(buffer: Buffer): string {
  let result = ""
  let bits = 0
  let value = 0

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += BASE32_CHARS[(value >>> bits) & 0x1f]
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f]
  }

  return result
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "")
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >>> bits) & 0xff)
    }
  }

  return Buffer.from(bytes)
}

// ── HOTP (RFC 4226) ──────────────────────────────────

function generateHotp(secret: Buffer, counter: number): string {
  // Convert counter to 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuf.writeUInt32BE(counter & 0xffffffff, 4)

  // HMAC-SHA1 (as specified by RFC 4226)
  const hmac = createHmac("sha1", secret).update(counterBuf).digest()

  // Dynamic truncation
  const offset = hmac[hmac.length - 1]! & 0x0f
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff)

  return String(code % 10 ** DIGITS).padStart(DIGITS, "0")
}

// ── TOTP (RFC 6238) ──────────────────────────────────

function generateTotp(secret: Buffer, time?: number): string {
  const now = time ?? Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / PERIOD)
  return generateHotp(secret, counter)
}

function verifyTotp(token: string, secret: Buffer, time?: number): boolean {
  const now = time ?? Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / PERIOD)

  // Check current step ± window
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (generateHotp(secret, counter + i) === token) {
      return true
    }
  }

  return false
}

// ── Public API ───────────────────────────────────────

/**
 * Generate a new TOTP secret and QR code for authenticator setup.
 */
export async function generateTotpSecret(
  accountName: string,
  issuer = "FestivalPlatform",
): Promise<{
  secret: string
  encryptedSecret: string
  otpauthUri: string
  qrCodeDataUrl: string
  backupCodes: string[]
  hashedBackupCodes: string[]
}> {
  // Generate 20 random bytes (160 bits) and encode as base32
  const secretBytes = randomBytes(20)
  const secret = base32Encode(secretBytes)

  // Encrypt for database storage
  const encryptedSecret = encrypt(secret)

  // Generate otpauth URI (RFC standard for QR code scanning)
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(accountName)
  const otpauthUri = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  })

  // Generate 10 single-use backup codes (8-char hex)
  const backupCodes = Array.from({ length: 10 }, () =>
    randomBytes(4).toString("hex").toUpperCase(),
  )

  // Hash backup codes for storage
  const hashedBackupCodes = backupCodes.map((code) =>
    createHash("sha256").update(code).digest("hex"),
  )

  return {
    secret,
    encryptedSecret,
    otpauthUri,
    qrCodeDataUrl,
    backupCodes,
    hashedBackupCodes,
  }
}

/**
 * Verify a TOTP token against an encrypted secret.
 */
export function verifyTotpToken(
  token: string,
  encryptedSecret: string,
): boolean {
  if (!token || !encryptedSecret) return false
  if (!/^\d{6}$/.test(token)) return false

  try {
    const secret = decrypt(encryptedSecret)
    const secretBytes = base32Decode(secret)
    return verifyTotp(token, secretBytes)
  } catch {
    return false
  }
}

/**
 * Generate a TOTP token for testing/verification purposes.
 * @internal — only used in tests, never exposed to users.
 */
export function _generateTokenForTesting(secret: string): string {
  const secretBytes = base32Decode(secret)
  return generateTotp(secretBytes)
}

/**
 * Verify a backup code (single-use).
 * Returns the index of the used code, or -1 if invalid.
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): number {
  if (!code || !hashedCodes.length) return -1

  const codeHash = createHash("sha256")
    .update(code.toUpperCase().trim())
    .digest("hex")

  return hashedCodes.findIndex((h) => h === codeHash)
}

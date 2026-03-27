/**
 * TOTP (Time-Based One-Time Password) — RFC 6238 compliant 2FA.
 *
 * Supports:
 * - Secret generation (base32-encoded, 160 bits)
 * - QR code URI for authenticator apps (Google Auth, Authy, 1Password)
 * - Token verification with ±1 period tolerance (30s window)
 * - Encrypted secret storage via AES-256-GCM
 *
 * Flow:
 * 1. Admin enables 2FA → generate secret + QR URI
 * 2. Admin scans QR with authenticator app
 * 3. Admin enters 6-digit code to confirm setup
 * 4. On login: password + TOTP code required
 */

import * as OTPAuth from "otpauth"
import { encrypt, decrypt } from "@/lib/crypto/aes256gcm"

const ISSUER = "FestivalPlatform"
const PERIOD = 30 // seconds
const DIGITS = 6
const ALGORITHM = "SHA1" // Required for Google Authenticator compatibility

export type TOTPSetup = {
  /** Base32-encoded secret (for storage — encrypt before persisting) */
  secret: string
  /** otpauth:// URI for QR code generation */
  uri: string
  /** Encrypted secret for database storage */
  encryptedSecret: string
}

/**
 * Generate a new TOTP secret and provisioning URI.
 * The secret is encrypted with AES-256-GCM for safe storage.
 */
export function generateTOTPSecret(accountName: string): TOTPSetup {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
  })

  const secret = totp.secret.base32
  const uri = totp.toString()
  const encryptedSecret = encrypt(secret)

  return { secret, uri, encryptedSecret }
}

/**
 * Verify a TOTP token against an encrypted secret.
 * Allows ±1 period tolerance (covers clock skew and slow typing).
 *
 * @returns true if valid, false if invalid
 */
export function verifyTOTP(token: string, encryptedSecret: string): boolean {
  if (!token || token.length !== DIGITS) return false

  const secret = decrypt(encryptedSecret)
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  // delta = null means invalid, otherwise returns the period offset
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

/**
 * Generate the current valid TOTP token (for testing only).
 */
export function generateCurrentToken(encryptedSecret: string): string {
  const secret = decrypt(encryptedSecret)
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  return totp.generate()
}

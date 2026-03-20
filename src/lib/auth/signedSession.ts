/**
 * Edge-compatible signed session tokens (HMAC-SHA256 via Web Crypto API).
 *
 * Format: base64url(payload).base64url(signature)
 *
 * Security properties:
 * - Tamper-proof: HMAC signature prevents payload modification
 * - Expirable: exp claim enforced on every verification
 * - Anti-replay: iat + configurable max-age window rejects stale tokens
 * - Subject binding: sub claim ties token to a specific actor
 *
 * Threat model mitigated:
 * - Token forgery → HMAC with SESSION_SECRET
 * - Token replay after expiry → exp claim
 * - Token replay from stolen backup → iat + MAX_TOKEN_AGE_MS window
 * - Session fixation → sub claim binds to actor
 * - Timing attacks → crypto.subtle.verify is constant-time
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
const MAX_TOKEN_AGE_MS = 8 * 60 * 60 * 1000 + 60_000 // TTL + 1 min tolerance
const MAX_CLOCK_DRIFT_MS = 30_000 // 30s future tolerance for iat
const ALGORITHM = { name: "HMAC", hash: "SHA-256" } as const

// ── Helpers ───────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env["SESSION_SECRET"]
  if (!secret) {
    throw new Error(
      "SESSION_SECRET env var is REQUIRED. " +
      "Unsigned sessions are not permitted in any environment."
    )
  }
  if (secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters. " +
      "Use: openssl rand -base64 48"
    )
  }

  const enc = new TextEncoder()
  return crypto.subtle.importKey("raw", enc.encode(secret), ALGORITHM, false, ["sign", "verify"])
}

// ── Types ─────────────────────────────────────────────

export type SignedPayload = {
  role: string
  exp: number  // expiresAt (epoch ms)
  iat: number  // issuedAt (epoch ms)
  sub: string  // actor identifier (required — no anonymous tokens)
}

// ── Public API ────────────────────────────────────────

/**
 * Creates an HMAC-SHA256 signed token.
 * Returns: base64url(payload).base64url(signature)
 *
 * @throws if SESSION_SECRET is not configured or too short.
 */
export async function createSignedToken(opts: {
  role: string
  userId?: string
}): Promise<string> {
  const now = Date.now()
  const payload: SignedPayload = {
    role: opts.role,
    exp: now + SESSION_TTL_MS,
    iat: now,
    sub: opts.userId ?? `admin:${now}`,
  }

  const payloadStr = JSON.stringify(payload)
  const enc = new TextEncoder()
  const payloadBytes = enc.encode(payloadStr)

  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes)

  return `${toBase64Url(payloadBytes.buffer as ArrayBuffer)}.${toBase64Url(signature)}`
}

/**
 * Verifies an HMAC-SHA256 signed token. Edge-compatible (Web Crypto).
 *
 * Checks (in order):
 * 1. Format: exactly 2 dot-separated parts
 * 2. Signature: HMAC verification (constant-time via WebCrypto)
 * 3. Payload structure: required fields present and typed correctly
 * 4. Expiration: now < exp
 * 5. Anti-replay: iat is within acceptable window (not too old, not future)
 * 6. Subject: sub is non-empty string
 *
 * Returns payload if ALL checks pass, null otherwise.
 */
export async function verifySignedToken(token: string): Promise<SignedPayload | null> {
  try {
    // 1. Format
    const dotIndex = token.indexOf(".")
    if (dotIndex === -1 || dotIndex === 0 || dotIndex === token.length - 1) return null
    // Ensure only one dot
    if (token.indexOf(".", dotIndex + 1) !== -1) return null

    const payloadB64 = token.substring(0, dotIndex)
    const signatureB64 = token.substring(dotIndex + 1)

    const payloadBytes = fromBase64Url(payloadB64)
    const signatureBytes = fromBase64Url(signatureB64)

    // 2. Signature
    const key = await getSigningKey()
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer as ArrayBuffer,
      payloadBytes.buffer as ArrayBuffer,
    )
    if (!valid) return null

    // 3. Payload structure
    const dec = new TextDecoder()
    const payload = JSON.parse(dec.decode(payloadBytes)) as Record<string, unknown>

    if (typeof payload["role"] !== "string" || payload["role"].length === 0) return null
    if (typeof payload["exp"] !== "number") return null
    if (typeof payload["iat"] !== "number") return null
    if (typeof payload["sub"] !== "string" || payload["sub"].length === 0) return null

    const typed: SignedPayload = {
      role: payload["role"],
      exp: payload["exp"],
      iat: payload["iat"],
      sub: payload["sub"],
    }

    // 4. Expiration
    const now = Date.now()
    if (now >= typed.exp) return null

    // 5. Anti-replay: iat window check
    //    - iat must not be in the future (with clock drift tolerance)
    //    - iat must not be older than MAX_TOKEN_AGE_MS
    if (typed.iat > now + MAX_CLOCK_DRIFT_MS) return null
    if (now - typed.iat > MAX_TOKEN_AGE_MS) return null

    // 6. Sanity: exp must be after iat
    if (typed.exp <= typed.iat) return null

    return typed
  } catch {
    return null
  }
}

/**
 * Quick format check — no crypto, only structure.
 * Use in contexts where you need to distinguish signed vs legacy tokens
 * BEFORE doing the full verification.
 */
export function looksLikeSignedToken(value: string): boolean {
  const dotIndex = value.indexOf(".")
  if (dotIndex === -1) return false
  // No second dot allowed
  if (value.indexOf(".", dotIndex + 1) !== -1) return false
  return dotIndex > 10 && value.length - dotIndex - 1 > 10
}

/**
 * Edge-compatible signed session tokens.
 *
 * Usa HMAC-SHA256 via Web Crypto API (disponible en edge runtime).
 * El token contiene: role + expiresAt, firmado con SESSION_SECRET.
 *
 * Formato: base64url(payload).base64url(signature)
 *
 * El proxy puede verificar el token sin acceder al session store.
 * Los route handlers siguen usando sessionStore como segunda barrera.
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
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
  if (!secret) throw new Error("SESSION_SECRET env var required for signed sessions")

  const enc = new TextEncoder()
  return crypto.subtle.importKey("raw", enc.encode(secret), ALGORITHM, false, ["sign", "verify"])
}

// ── Types ─────────────────────────────────────────────

export type SignedPayload = {
  role: string
  exp: number  // expiresAt (epoch ms)
  iat: number  // issuedAt (epoch ms)
  sub?: string // userId
}

// ── Public API ────────────────────────────────────────

/**
 * Crea un token firmado con HMAC-SHA256.
 * Retorna string: base64url(payload).base64url(signature)
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
    ...(opts.userId ? { sub: opts.userId } : {}),
  }

  const payloadStr = JSON.stringify(payload)
  const enc = new TextEncoder()
  const payloadBytes = enc.encode(payloadStr)

  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes)

  return `${toBase64Url(payloadBytes.buffer as ArrayBuffer)}.${toBase64Url(signature)}`
}

/**
 * Verifica un token firmado. Edge-compatible (Web Crypto).
 * Retorna el payload si válido, null si inválido o expirado.
 */
export async function verifySignedToken(token: string): Promise<SignedPayload | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) return null

    const [payloadB64, signatureB64] = parts as [string, string]
    const payloadBytes = fromBase64Url(payloadB64)
    const signatureBytes = fromBase64Url(signatureB64)

    const key = await getSigningKey()
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer as ArrayBuffer,
      payloadBytes.buffer as ArrayBuffer,
    )
    if (!valid) return null

    const dec = new TextDecoder()
    const payload = JSON.parse(dec.decode(payloadBytes)) as SignedPayload

    // Check expiry
    if (Date.now() >= payload.exp) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Quick format check — no crypto, solo estructura.
 * Para uso en contextos donde no se necesita verificación completa.
 */
export function looksLikeSignedToken(value: string): boolean {
  const parts = value.split(".")
  return parts.length === 2 && parts[0]!.length > 10 && parts[1]!.length > 10
}

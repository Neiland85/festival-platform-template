import crypto from "crypto"

function hmac(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("hex")
}

export function createCsrfToken(opts: { secret: string; sessionId: string }) {
  const nonce = crypto.randomUUID()
  const sig = hmac(`${opts.sessionId}.${nonce}`, opts.secret)
  return `${opts.sessionId}.${nonce}.${sig}`
}

export function verifyCsrfToken(opts: { secret: string; token: string; sessionId: string }) {
  const parts = opts.token.split(".")
  if (parts.length !== 3) return false
  const sid = parts[0] as string
  const nonce = parts[1] as string
  const sig = parts[2] as string
  if (sid !== opts.sessionId) return false
  const expected = hmac(`${sid}.${nonce}`, opts.secret)
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

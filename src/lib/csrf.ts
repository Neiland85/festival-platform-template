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
  try {
    const parts = opts.token.split(".")
    if (parts.length !== 3) return false

    const sid = parts[0] as string
    const nonce = parts[1] as string
    const sig = parts[2] as string

    if (!sid || !nonce || !sig) return false
    if (sid !== opts.sessionId) return false

    const expected = hmac(`${sid}.${nonce}`, opts.secret)
    const sigBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)

    if (sigBuffer.length === 0 || expectedBuffer.length === 0) return false
    if (sigBuffer.length !== expectedBuffer.length) return false

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

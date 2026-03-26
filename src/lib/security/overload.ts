/**
 * Overload guard — protege rutas de tráfico excesivo.
 *
 * Si Redis (Upstash) está disponible → sliding window distribuido.
 * Fallback → Map en memoria (single-process).
 *
 * 120 req/min por key (más permisivo que rate limit por IP).
 */

type Bucket = {
  count: number
  reset: number
}

const buckets = new Map<string, Bucket>()
const WINDOW = 60 * 1000
const LIMIT = 120

/**
 * Sync overload guard — in-memory sliding window.
 * Returns true if request is allowed, false if overloaded.
 * 120 req/min per key (more permissive than rate limit per IP).
 */
export function overloadGuard(key: string): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket) {
    buckets.set(key, { count: 1, reset: now + WINDOW })
    return true
  }

  if (now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW })
    return true
  }

  if (bucket.count >= LIMIT) {
    return false
  }

  bucket.count++
  return true
}

/** Para tests */
export function _resetOverloadStore(): void {
  buckets.clear()
}

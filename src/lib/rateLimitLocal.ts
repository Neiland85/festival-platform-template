/**
 * In-memory sliding window rate limiter.
 *
 * ALGORITHM:
 *   Each IP has an array of request timestamps. On each request:
 *   1. Evict timestamps older than windowMs
 *   2. If remaining count < max → allow, push new timestamp
 *   3. Else → reject, return retryAfterMs
 *
 *   This is a TRUE sliding window — not fixed-bucket approximation.
 *   Trade-off: O(n) per-IP storage where n = max requests in window.
 *   At max=20 that's ~160 bytes per IP — negligible.
 *
 * MEMORY SAFETY:
 *   - MAX_STORE_SIZE caps total tracked IPs (evicts oldest on overflow)
 *   - Lazy cleanup every N calls removes fully-expired entries
 *   - No background timers (serverless-safe)
 *
 * CONFIGURABILITY:
 *   windowMs and maxRequests are injected by the facade (rate-limit.ts)
 *   from Zod-validated env vars. This module has no env dependency.
 */

const CLEANUP_EVERY = 50
const MAX_STORE_SIZE = 10_000

/** Sorted array of request timestamps (ms since epoch) */
const store = new Map<string, number[]>()
let callCounter = 0

// ── Cleanup ──────────────────────────────────────────

function cleanupExpired(now: number, windowMs: number): void {
  const cutoff = now - windowMs
  for (const [key, timestamps] of store) {
    // Remove entries where ALL timestamps are expired
    const newest = timestamps[timestamps.length - 1]
    if (timestamps.length === 0 || (newest !== undefined && newest < cutoff)) {
      store.delete(key)
    }
  }
}

function maybeCleanup(now: number, windowMs: number): void {
  callCounter++
  if (callCounter % CLEANUP_EVERY === 0) {
    cleanupExpired(now, windowMs)
  }
}

// ── Core ─────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** ms until the oldest request in window expires (0 if allowed) */
  retryAfterMs: number
  /** Total requests in current window */
  current: number
  limit: number
}

export function rateLimit(
  ip: string,
  windowMs: number = 60_000,
  maxRequests: number = 20,
): RateLimitResult {
  const now = Date.now()
  maybeCleanup(now, windowMs)

  const cutoff = now - windowMs
  let timestamps = store.get(ip)

  if (!timestamps) {
    // Evict oldest entry if store is full
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value
      if (firstKey !== undefined) store.delete(firstKey)
    }
    timestamps = [now]
    store.set(ip, timestamps)
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0, current: 1, limit: maxRequests }
  }

  // Evict expired timestamps from this IP's window
  // Binary search would be optimal but at max=20 linear is fine
  while (timestamps.length > 0 && (timestamps[0] ?? 0) < cutoff) {
    timestamps.shift()
  }

  const current = timestamps.length

  if (current >= maxRequests) {
    // Blocked — retryAfter = time until oldest request leaves the window
    const oldestInWindow = timestamps[0] ?? now
    const retryAfterMs = Math.max(0, oldestInWindow + windowMs - now)
    return { allowed: false, remaining: 0, retryAfterMs, current, limit: maxRequests }
  }

  timestamps.push(now)
  return {
    allowed: true,
    remaining: maxRequests - current - 1,
    retryAfterMs: 0,
    current: current + 1,
    limit: maxRequests,
  }
}

// ── Test helpers ─────────────────────────────────────

/** @internal — for tests only */
export function _resetStore(): void {
  store.clear()
  callCounter = 0
}

/** @internal — for tests only */
export function _getStoreSize(): number {
  return store.size
}

/** @internal — for tests only */
export function _getCleanupEvery(): number {
  return CLEANUP_EVERY
}

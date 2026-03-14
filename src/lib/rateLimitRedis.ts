/**
 * Distributed rate limiter — @upstash/ratelimit (edge-compatible).
 *
 * Uses sliding-window algorithm with Redis backend.
 * Falls back gracefully if Redis is unavailable.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { getRedis, isRedisAvailable } from "@/lib/redis/client"

const WINDOW = "60 s"
const LIMIT = 20

let limiter: Ratelimit | null = null

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter
  const redis = getRedis()
  if (!redis) return null

  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    prefix: "solaris:rl",
    analytics: false,
  })

  return limiter
}

export async function rateLimitRedis(
  ip: string
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const rl = getLimiter()
  if (!rl) throw new Error("Redis not available")

  const { success, remaining, reset } = await rl.limit(ip)
  const retryAfterMs = success ? 0 : Math.max(0, reset - Date.now())

  return { allowed: success, remaining, retryAfterMs }
}

export { isRedisAvailable }

/** Exposed for testing */
export function _resetLimiter(): void {
  limiter = null
}

/**
 * Overload guard — protege rutas de tráfico excesivo.
 *
 * Si Redis (Upstash) está disponible → sliding window distribuido.
 * Fallback → Map en memoria (single-process).
 *
 * 120 req/min por key (más permisivo que rate limit por IP).
 */

import { getRedis } from "@/lib/redis/client"

type Bucket = {
  count: number
  reset: number
}

const buckets = new Map<string, Bucket>()
const WINDOW = 60 * 1000
const WINDOW_SECONDS = 60
const LIMIT = 120
const REDIS_PREFIX = "solaris:overload:"

/**
 * Returns true if request is allowed, false if overloaded.
 * Async to support Redis backend.
 */
export async function overloadGuardAsync(key: string): Promise<boolean> {
  const redis = getRedis()

  if (redis) {
    try {
      const redisKey = `${REDIS_PREFIX}${key}`
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.expire(redisKey, WINDOW_SECONDS)
      }
      return count <= LIMIT
    } catch {
      // Redis error → fall through to local
    }
  }

  return overloadGuard(key)
}

/**
 * Sync-only overload guard — always in-memory.
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

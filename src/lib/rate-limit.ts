import { rateLimitRedis } from "./rateLimitRedis"
import {
  rateLimit as rateLimitLocal,
  _resetStore,
  _getStoreSize,
  _getCleanupEvery,
} from "./rateLimitLocal"

/**
 * Unified rate limiter.
 *
 * Strategy:
 *   1. If UPSTASH_REDIS_REST_URL is set → distributed rate limiting via @upstash/ratelimit
 *   2. Fallback → in-memory Map (single-process, existing behavior)
 *
 * The async wrapper is transparent to callers that `await` the result.
 * For sync-only callers the local fallback is always synchronous.
 */
export async function rateLimit(ip: string): Promise<boolean> {
  if (process.env["UPSTASH_REDIS_REST_URL"]) {
    try {
      const result = await rateLimitRedis(ip)
      return result.allowed
    } catch {
      // Redis unreachable — degrade gracefully to local
    }
  }

  return rateLimitLocal(ip)
}

/**
 * Sync-only rate limiter (for contexts that cannot be async).
 * Always uses in-memory store.
 */
export function rateLimitSync(ip: string): boolean {
  return rateLimitLocal(ip)
}

// Re-export test helpers
export { _resetStore, _getStoreSize, _getCleanupEvery }

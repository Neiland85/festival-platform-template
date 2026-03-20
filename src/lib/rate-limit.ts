/**
 * Unified rate limiter — facade over Redis (distributed) and in-memory (local).
 *
 * STRATEGY:
 *   1. If Upstash Redis is configured → sliding window via @upstash/ratelimit
 *   2. Redis unreachable → degrade gracefully to in-memory
 *   3. No Redis configured → in-memory only
 *
 * CONFIGURATION (via Zod-validated env):
 *   RATE_LIMIT_WINDOW_MS       — window size (default: 60000 = 1 min)
 *   RATE_LIMIT_MAX_REQUESTS    — max requests per IP per window (default: 20)
 *   RATE_LIMIT_API_MAX_REQUESTS — stricter limit for auth endpoints (default: 10)
 *
 * RETURN VALUE:
 *   Rich result with { allowed, remaining, retryAfterMs } — callers can
 *   set Retry-After and X-RateLimit-* headers from this.
 */

import { rateLimitRedis } from "./rateLimitRedis"
import { serverEnv } from "@/lib/env"
import {
  rateLimit as rateLimitLocal,
  _resetStore,
  _getStoreSize,
  _getCleanupEvery,
} from "./rateLimitLocal"
import type { RateLimitResult } from "./rateLimitLocal"

export type { RateLimitResult }

// ── Config from validated env ────────────────────────

const WINDOW_MS = serverEnv.RATE_LIMIT_WINDOW_MS
const MAX_REQUESTS = serverEnv.RATE_LIMIT_MAX_REQUESTS
const API_MAX_REQUESTS = serverEnv.RATE_LIMIT_API_MAX_REQUESTS

/**
 * General-purpose rate limiter.
 * Returns rich result; callers decide what headers to set.
 */
export async function rateLimit(ip: string): Promise<RateLimitResult> {
  if (serverEnv.UPSTASH_REDIS_REST_URL) {
    try {
      const result = await rateLimitRedis(ip)
      return {
        allowed: result.allowed,
        remaining: result.remaining,
        retryAfterMs: result.retryAfterMs,
        current: MAX_REQUESTS - result.remaining,
        limit: MAX_REQUESTS,
      }
    } catch {
      // Redis unreachable → degrade gracefully to local
    }
  }

  return rateLimitLocal(ip, WINDOW_MS, MAX_REQUESTS)
}

/**
 * Stricter rate limiter for sensitive endpoints (login, auth, checkout).
 */
export async function rateLimitStrict(ip: string): Promise<RateLimitResult> {
  // For Redis path we'd ideally use a separate prefix/config —
  // for now we only differentiate on the local fallback
  return rateLimitLocal(ip, WINDOW_MS, API_MAX_REQUESTS)
}

/**
 * Sync-only rate limiter (for contexts that cannot be async).
 * Always uses in-memory store.
 */
export function rateLimitSync(ip: string): RateLimitResult {
  return rateLimitLocal(ip, WINDOW_MS, MAX_REQUESTS)
}

/**
 * Apply standard rate limit response headers.
 */
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
): void {
  headers.set("X-RateLimit-Limit", String(result.limit))
  headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)))
  if (!result.allowed) {
    headers.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)))
  }
}

// Re-export test helpers
export { _resetStore, _getStoreSize, _getCleanupEvery }

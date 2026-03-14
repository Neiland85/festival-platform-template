/**
 * Login-specific rate limiter — 5 failed attempts per IP per 60s.
 *
 * Si Redis (Upstash) está disponible → distribuido vía INCR.
 * Fallback → Map en memoria.
 */

import { getRedis } from "@/lib/redis/client"

const LOGIN_WINDOW_MS = 60_000
const LOGIN_WINDOW_SECONDS = 60
const MAX_ATTEMPTS = 5
const REDIS_PREFIX = "solaris:login_attempts:"

// In-memory fallback
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if IP has exceeded login attempts.
 * Returns true if blocked (too many attempts).
 */
export async function isLoginBlocked(ip: string): Promise<boolean> {
  const redis = getRedis()

  if (redis) {
    try {
      const key = `${REDIS_PREFIX}${ip}`
      const count = await redis.get<number>(key)
      return count !== null && count >= MAX_ATTEMPTS
    } catch {
      // Fall through to local
    }
  }

  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return true
  }
  return false
}

/**
 * Record a failed login attempt for IP.
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  const redis = getRedis()

  if (redis) {
    try {
      const key = `${REDIS_PREFIX}${ip}`
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, LOGIN_WINDOW_SECONDS)
      }
      return
    } catch {
      // Fall through to local
    }
  }

  const now = Date.now()
  const current = loginAttempts.get(ip)
  if (!current || now >= current.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  } else {
    current.count++
  }
}

/**
 * Clear failed attempts for IP (after successful login).
 */
export async function clearAttempts(ip: string): Promise<void> {
  const redis = getRedis()

  if (redis) {
    try {
      await redis.del(`${REDIS_PREFIX}${ip}`)
    } catch {
      // swallow
    }
  }

  loginAttempts.delete(ip)
}

/** Para tests */
export function _resetLoginAttempts(): void {
  loginAttempts.clear()
}

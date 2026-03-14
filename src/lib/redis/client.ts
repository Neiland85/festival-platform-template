/**
 * Upstash Redis client — singleton, edge-compatible (HTTP-based).
 *
 * Env vars:
 *   UPSTASH_REDIS_REST_URL   — REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN — Bearer token
 *
 * In development without these env vars, `getRedis()` returns null
 * and all consumers fall back to in-memory stores.
 */

import { Redis } from "@upstash/redis"

let instance: Redis | null = null

export function getRedis(): Redis | null {
  if (instance) return instance

  const url = process.env["UPSTASH_REDIS_REST_URL"]
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]

  if (!url || !token) return null

  instance = new Redis({ url, token })
  return instance
}

/** Check if Redis is reachable (for health checks) */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedis()
    if (!client) return false
    await client.ping()
    return true
  } catch {
    return false
  }
}

/** Exposed for testing — reset singleton */
export function _resetRedisClient(): void {
  instance = null
}

/**
 * Idempotency-Key guard — previene procesamiento duplicado de peticiones.
 *
 * Si Redis (Upstash) está disponible → usa SET NX EX para multi-instancia.
 * Fallback → Map en memoria (single-process).
 *
 * Uso: const dup = await checkIdempotencyKey(key) → boolean (true = duplicado)
 */

import { getRedis } from "@/lib/redis/client"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TTL_MS = 5 * 60 * 1000 // 5 min
const TTL_SECONDS = 300
const MAX_KEYS = 10_000

// In-memory fallback
const seen = new Map<string, number>()

function cleanupLocal() {
  const now = Date.now()
  for (const [key, ts] of seen) {
    if (now - ts > TTL_MS) seen.delete(key)
  }
}

export function isValidIdempotencyKey(key: string): boolean {
  return UUID_RE.test(key)
}

/**
 * Retorna true si la key ya fue procesada (duplicado).
 * Si es nueva, la registra y retorna false.
 *
 * Now async to support Redis backend.
 */
export async function checkIdempotencyKey(key: string): Promise<boolean> {
  const redis = getRedis()

  if (redis) {
    try {
      // SET key 1 NX EX 300 → returns "OK" if key was set, null if already existed
      const result = await redis.set(`solaris:idem:${key}`, "1", {
        nx: true,
        ex: TTL_SECONDS,
      })
      return result === null // null means key existed → duplicate
    } catch {
      // Redis error → fall through to local
    }
  }

  // In-memory fallback
  if (seen.size > MAX_KEYS) cleanupLocal()
  if (seen.has(key)) return true
  seen.set(key, Date.now())
  return false
}

/**
 * Sync-only check — always in-memory. Kept for backward compatibility.
 */
export function checkIdempotencyKeySync(key: string): boolean {
  if (seen.size > MAX_KEYS) cleanupLocal()
  if (seen.has(key)) return true
  seen.set(key, Date.now())
  return false
}

/** Para tests */
export function _resetIdempotencyStore(): void {
  seen.clear()
}

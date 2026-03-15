/**
 * Queue Facade — Redis-first con fallback a in-memory.
 *
 * En producción con UPSTASH_REDIS_REST_URL: usa Redis (persistente entre cold starts).
 * Sin Redis o si Redis falla: fallback a burstQueue (in-memory).
 */
type QueueItem = Record<string, unknown>

import { enqueueRedis, dequeueRedis } from "./redisQueue"
import { enqueue as enqueueLocal, dequeue as dequeueLocal } from "./burstQueue"
import { log } from "@/lib/logger"

function hasRedis(): boolean {
  return !!process.env["UPSTASH_REDIS_REST_URL"]
}

export async function enqueue(item: QueueItem): Promise<void> {
  if (hasRedis()) {
    try {
      await enqueueRedis(item)
      return
    } catch (err) {
      log("warn", "redis_queue_enqueue_fallback", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  enqueueLocal(item)
}

export async function dequeue(): Promise<QueueItem | undefined> {
  if (hasRedis()) {
    try {
      const item = await dequeueRedis()
      return item ?? undefined
    } catch (err) {
      log("warn", "redis_queue_dequeue_fallback", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return dequeueLocal()
}

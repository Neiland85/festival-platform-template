/**
 * Queue Facade — Redis-first con fallback a in-memory.
 *
 * En producción con UPSTASH_REDIS_REST_URL: usa Redis (persistente entre cold starts).
 * Sin Redis o si Redis falla: fallback a burstQueue (in-memory).
 */

import { enqueueRedis, dequeueRedis } from "./redisQueue"
import { enqueue as enqueueLocal, dequeue as dequeueLocal } from "./burstQueue"
import { log } from "@/lib/logger"
import { features } from "@/lib/env"

interface QueueJobInput {
  jobId: string
  idempotencyToken: string
  payload: Record<string, unknown>
}

function hasRedis(): boolean {
  return features.redis
}

export async function enqueue(item: QueueJobInput): Promise<void> {
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
  enqueueLocal(item as unknown as Record<string, unknown>)
}

export async function dequeue(): Promise<Record<string, unknown> | undefined> {
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

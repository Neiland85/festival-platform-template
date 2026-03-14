/**
 * Queue Facade — Redis-first con fallback a in-memory.
 *
 * En producción con UPSTASH_REDIS_REST_URL: usa Redis (persistente entre cold starts).
 * Sin Redis o si Redis falla: fallback a burstQueue (in-memory).
 */
import type { Lead } from "@/domain/leads/types"
import { enqueueLeadRedis, dequeueLeadRedis } from "./redisQueue"
import { enqueueLead as enqueueLocal, dequeueLead as dequeueLocal } from "./burstQueue"
import { log } from "@/lib/logger"

function hasRedis(): boolean {
  return !!process.env["UPSTASH_REDIS_REST_URL"]
}

export async function enqueueLead(lead: Lead): Promise<void> {
  if (hasRedis()) {
    try {
      await enqueueLeadRedis(lead)
      return
    } catch (err) {
      log("warn", "redis_queue_enqueue_fallback", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  enqueueLocal(lead)
}

export async function dequeueLead(): Promise<Lead | undefined> {
  if (hasRedis()) {
    try {
      const lead = await dequeueLeadRedis()
      return lead ?? undefined
    } catch (err) {
      log("warn", "redis_queue_dequeue_fallback", {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return dequeueLocal()
}

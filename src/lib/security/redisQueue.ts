import { getRedis } from "@/lib/redis/client"
import type { Lead } from "@/domain/leads/create-lead"

const QUEUE_KEY = "solaris:lead_queue"

function requireRedis() {
  const client = getRedis()
  if (!client) throw new Error("Redis not configured (UPSTASH_REDIS_REST_URL)")
  return client
}

export async function enqueueLeadRedis(lead: Lead) {
  await requireRedis().lpush(QUEUE_KEY, JSON.stringify(lead))
}

export async function dequeueLeadRedis(): Promise<Lead | null> {
  const item = await requireRedis().rpop<string>(QUEUE_KEY)
  if (!item) return null
  return JSON.parse(item) as Lead
}

export async function queueLength() {
  return requireRedis().llen(QUEUE_KEY)
}

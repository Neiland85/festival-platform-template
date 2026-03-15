import { getRedis } from "@/lib/redis/client"

type QueueItem = Record<string, unknown>

const QUEUE_KEY = "platform:job_queue"

function requireRedis() {
  const client = getRedis()
  if (!client) throw new Error("Redis not configured (UPSTASH_REDIS_REST_URL)")
  return client
}

export async function enqueueRedis(item: QueueItem) {
  await requireRedis().lpush(QUEUE_KEY, JSON.stringify(item))
}

export async function dequeueRedis(): Promise<QueueItem | null> {
  const raw = await requireRedis().rpop<string>(QUEUE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as QueueItem
}

export async function queueLength() {
  return requireRedis().llen(QUEUE_KEY)
}

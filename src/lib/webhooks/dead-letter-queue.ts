/**
 * Dead-Letter Queue for webhook events.
 *
 * When a webhook event fails processing (e.g., Stripe checkout.session.completed
 * but completeOrder() throws), the event is stored in PostgreSQL for manual
 * review and retry via the admin dashboard.
 *
 * This prevents silent event loss that was previously masked by the 200
 * response strategy (return 200 to prevent Stripe retries on internal errors).
 */

import { desc, isNull, eq } from "drizzle-orm"
import { getDb } from "@/adapters/db/drizzle"
import { webhookDeadLetters } from "@/adapters/db/schema"

export type DeadLetterInput = {
  provider: string
  eventType: string
  eventId: string
  payload: unknown
  error: string
}

/**
 * Store a failed webhook event in the dead-letter queue.
 * Fire-and-forget — failures are logged but never propagated.
 */
export function enqueueDeadLetter(input: DeadLetterInput): void {
  const db = getDb()

  db.insert(webhookDeadLetters)
    .values({
      provider: input.provider,
      eventType: input.eventType,
      eventId: input.eventId,
      payload: JSON.stringify(input.payload),
      error: input.error,
    })
    .then(() => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "warn",
          event: "webhook_dead_letter",
          provider: input.provider,
          eventType: input.eventType,
          eventId: input.eventId,
          error: input.error,
        }),
      )
    })
    .catch((err: unknown) => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "dlq_persist_failed",
          eventId: input.eventId,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    })
}

/**
 * List unresolved dead-letter events for the admin dashboard.
 */
export async function listDeadLetters(limit = 50) {
  const db = getDb()

  return db
    .select()
    .from(webhookDeadLetters)
    .where(isNull(webhookDeadLetters.resolvedAt))
    .orderBy(desc(webhookDeadLetters.createdAt))
    .limit(limit)
}

/**
 * Mark a dead-letter event as resolved (after manual retry or acknowledgment).
 */
export async function resolveDeadLetter(id: string) {
  const db = getDb()

  return db
    .update(webhookDeadLetters)
    .set({ resolvedAt: new Date() })
    .where(eq(webhookDeadLetters.id, id))
}

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

import { desc, isNull, eq, sql } from "drizzle-orm"
import { getDb } from "@/adapters/db/drizzle"
import { webhookDeadLetters } from "@/adapters/db/schema"
import { completeOrder } from "@/domain/orders/complete-order"
import { cancelOrder } from "@/domain/orders/cancel-order"
import { findById } from "@/domain/orders/order-repository"

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
  // ── Immediate structured alert (synchronous, never throws) ──
  // Fires before the async DB insert so log aggregators (Datadog, CloudWatch,
  // etc.) capture the failure even if the DLQ persist itself fails.
  try {
    const payload = input.payload as Record<string, unknown> | null
    const orderId =
      (payload?.["metadata"] as Record<string, string> | undefined)?.["orderId"] ??
      (payload as { id?: string } | undefined)?.id ??
      undefined

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "webhook_processing_failed",
        alert: true,
        correlationId: input.eventId,
        provider: input.provider,
        eventType: input.eventType,
        eventId: input.eventId,
        error: input.error,
        ...(orderId && { orderId }),
      }),
    )
  } catch {
    // Guard: JSON.stringify can throw on circular refs in exotic payloads.
    // Swallow silently — the DB insert below is the real persistence.
  }

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
          correlationId: input.eventId,
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
          correlationId: input.eventId,
          eventId: input.eventId,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    })
}

/**
 * Fetch all dead-letter entries for a given Stripe eventId (correlationId).
 * Returns newest first. Used by the timeline endpoint.
 */
export async function getDeadLettersByEventId(eventId: string) {
  const db = getDb()

  return db
    .select()
    .from(webhookDeadLetters)
    .where(eq(webhookDeadLetters.eventId, eventId))
    .orderBy(desc(webhookDeadLetters.createdAt))
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

/**
 * Fetch a single dead-letter entry by ID.
 */
export async function getDeadLetter(id: string) {
  const db = getDb()

  const rows = await db
    .select()
    .from(webhookDeadLetters)
    .where(eq(webhookDeadLetters.id, id))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Event types that are safe to retry because the domain layer is idempotent.
 *
 * completeOrder: WHERE status = 'reserved' → no-op if already completed.
 * cancelOrder:   WHERE status = 'reserved' → no-op if already terminal.
 *
 * payment_intent.succeeded: resolves orderId from metadata → order.stripeSessionId
 * → completeOrder(sessionId). Same idempotency guarantees as checkout.session.completed.
 */
const RETRY_SAFE_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "payment_intent.succeeded",
])

const MAX_RETRY_ATTEMPTS = 5

export type RetryResult =
  | { ok: true }
  | { ok: false; reason: string; code: "already_resolved" | "max_attempts" | "not_retryable" | "not_found" | "domain_error" }

/**
 * Retry a dead-letter event by re-executing the domain handler.
 *
 * Guards:
 * - Rejects already-resolved entries
 * - Rejects entries with attempts >= MAX_RETRY_ATTEMPTS
 * - Rejects event types that are not idempotent-safe
 *
 * On success: increments attempts, auto-resolves the entry.
 * On failure: increments attempts, updates error column, leaves unresolved.
 */
export async function retryDeadLetter(id: string): Promise<RetryResult> {
  const entry = await getDeadLetter(id)

  if (!entry) {
    return { ok: false, reason: "Dead letter entry not found", code: "not_found" }
  }

  if (entry.resolvedAt !== null) {
    return { ok: false, reason: "Entry is already resolved", code: "already_resolved" }
  }

  if (entry.attempts >= MAX_RETRY_ATTEMPTS) {
    return {
      ok: false,
      reason: `Max retry attempts reached (${entry.attempts}/${MAX_RETRY_ATTEMPTS})`,
      code: "max_attempts",
    }
  }

  if (!RETRY_SAFE_EVENT_TYPES.has(entry.eventType)) {
    return {
      ok: false,
      reason: `Event type "${entry.eventType}" is not safe to retry. ` +
        "Only checkout.session.completed, checkout.session.expired, and payment_intent.succeeded are retryable.",
      code: "not_retryable",
    }
  }

  // Parse the stored payload to extract identifiers
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(entry.payload as string)
  } catch {
    return { ok: false, reason: "Stored payload is not valid JSON", code: "domain_error" }
  }

  const db = getDb()

  try {
    if (entry.eventType === "checkout.session.completed") {
      // Payload is a Checkout.Session — payload.id is the session ID (cs_xxx)
      const sessionId = (payload as { id?: string }).id
      if (!sessionId || typeof sessionId !== "string") {
        return { ok: false, reason: "Payload missing session ID (payload.id)", code: "domain_error" }
      }
      await completeOrder(sessionId)
    } else if (entry.eventType === "checkout.session.expired") {
      // Payload is a Checkout.Session — payload.id is the session ID (cs_xxx)
      const sessionId = (payload as { id?: string }).id
      if (!sessionId || typeof sessionId !== "string") {
        return { ok: false, reason: "Payload missing session ID (payload.id)", code: "domain_error" }
      }
      await cancelOrder(sessionId)
    } else if (entry.eventType === "payment_intent.succeeded") {
      // Payload is a PaymentIntent — resolve orderId → order.stripeSessionId
      const metadata = (payload as { metadata?: Record<string, string> }).metadata
      const orderId = metadata?.["orderId"]
      if (!orderId) {
        return { ok: false, reason: "PaymentIntent payload missing metadata.orderId", code: "domain_error" }
      }
      const order = await findById(orderId)
      if (!order) {
        return { ok: false, reason: `Order not found: ${orderId}`, code: "domain_error" }
      }
      if (!order.stripeSessionId) {
        return { ok: false, reason: `Order ${orderId} has no linked Stripe session ID`, code: "domain_error" }
      }
      await completeOrder(order.stripeSessionId)
    }

    // Success: increment attempts and auto-resolve
    await db
      .update(webhookDeadLetters)
      .set({
        attempts: sql`${webhookDeadLetters.attempts} + 1`,
        resolvedAt: new Date(),
      })
      .where(eq(webhookDeadLetters.id, id))

    return { ok: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    // Failure: increment attempts and update error, leave unresolved
    await db
      .update(webhookDeadLetters)
      .set({
        attempts: sql`${webhookDeadLetters.attempts} + 1`,
        error: errorMsg,
      })
      .where(eq(webhookDeadLetters.id, id))
      .catch((updateErr: unknown) => {
        // If even the DLQ update fails, log but don't propagate —
        // the caller still gets the domain error.
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            event: "dlq_retry_update_failed",
            dlqId: id,
            error: updateErr instanceof Error ? updateErr.message : String(updateErr),
          }),
        )
      })

    return { ok: false, reason: errorMsg, code: "domain_error" }
  }
}

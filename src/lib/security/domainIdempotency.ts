/**
 * Domain Idempotency — Prevent duplicate effects in business logic
 *
 * Purpose:
 *   Database-level idempotency (platform_outbox) prevents duplicate *rows*.
 *   Domain idempotency prevents duplicate *effects* (side effects, state changes).
 *
 * Example:
 *   Two workers both process "create_lead" job with token=X
 *   - Database prevents duplicate INSERT into platform_outbox
 *   - But domain logic ALSO must prevent:
 *     - Creating two lead records
 *     - Sending two emails
 *     - Charging two times
 *     - Creating two payment intents
 *
 * Pattern:
 *   1. Before executing domain logic, check applied_operations table
 *   2. If operation already applied: return cached result
 *   3. If not applied: execute logic, then record in applied_operations
 *   4. UPSERT pattern prevents race on "already applied" check
 *
 * Table schema:
 *   CREATE TABLE applied_operations (
 *     id BIGSERIAL PRIMARY KEY,
 *     idempotency_token UUID NOT NULL,
 *     operation_type VARCHAR(100) NOT NULL,
 *     result JSONB NOT NULL,
 *     created_at TIMESTAMP WITH TIME ZONE,
 *     UNIQUE (idempotency_token, operation_type)
 *   )
 */

import { db } from "@/lib/db"
import { log } from "@/lib/logger"

type OperationType = "create_lead" | "send_email" | "sync_external_api" | "process_payment"

/**
 * Check if operation was already applied (domain idempotency)
 *
 * Returns cached result if operation already executed.
 * This prevents side effects like double-charges, duplicate leads, etc.
 *
 * Example:
 *   const cached = await checkOperationApplied("create_lead", tokenId)
 *   if (cached.applied) {
 *     return cached.result  // Return cached result, don't execute again
 *   }
 */
export async function checkOperationApplied(
  idempotencyToken: string,
  operationType: OperationType
): Promise<{
  applied: boolean
  result?: unknown
}> {
  try {
    const result = await db.query(
      `SELECT result FROM applied_operations
       WHERE idempotency_token = ? AND operation_type = ?
       LIMIT 1`,
      [idempotencyToken, operationType]
    )

    if (result.rows.length > 0) {
      log("info", "domain_operation_cached", {
        idempotencyToken,
        operationType,
      })

      return {
        applied: true,
        result: result.rows[0].result,
      }
    }

    return { applied: false }
  } catch (error) {
    log("error", "check_operation_applied_failed", {
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Record that operation was applied (domain idempotency)
 *
 * MUST be called AFTER domain logic executes successfully.
 * Uses UPSERT to handle race conditions (two workers checking simultaneously).
 *
 * Example:
 *   // Execute domain logic
 *   const lead = await createLeadInCRM(data)
 *
 *   // Record that we applied it
 *   await recordOperationApplied(
 *     idempotencyToken,
 *     "create_lead",
 *     lead
 *   )
 *
 * CRITICAL: Call this BEFORE any other side effects that might fail
 * Pattern:
 *   1. Check if already applied
 *   2. If not: execute domain logic
 *   3. Record in applied_operations (Postgres)
 *   4. All other side effects (Redis cleanup, etc.) are best-effort
 */
export async function recordOperationApplied(
  idempotencyToken: string,
  operationType: OperationType,
  result: unknown
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO applied_operations
       (idempotency_token, operation_type, result, created_at)
       VALUES (?, ?, ?, NOW())
       ON CONFLICT (idempotency_token, operation_type)
       DO UPDATE SET result = ?
       WHERE applied_operations.idempotency_token = ?
       AND applied_operations.operation_type = ?`,
      [
        idempotencyToken,
        operationType,
        JSON.stringify(result),
        JSON.stringify(result),
        idempotencyToken,
        operationType,
      ]
    )

    log("info", "domain_operation_recorded", {
      idempotencyToken,
      operationType,
    })
  } catch (error) {
    log("error", "record_operation_applied_failed", {
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Execute operation with domain idempotency guarantee
 *
 * This is the recommended wrapper that combines the check + execute + record pattern.
 *
 * Example:
 *   const result = await executeWithDomainIdempotency(
 *     idempotencyToken,
 *     "create_lead",
 *     async () => {
 *       return await createLeadInCRM(leadData)
 *     }
 *   )
 *
 * Returns: Result of operation (either fresh or cached)
 */
export async function executeWithDomainIdempotency<T>(
  idempotencyToken: string,
  operationType: OperationType,
  operation: () => Promise<T>
): Promise<T> {
  // Step 1: Check if already applied
  const cached = await checkOperationApplied(idempotencyToken, operationType)
  if (cached.applied) {
    log("info", "domain_operation_skipped_cached", {
      idempotencyToken,
      operationType,
    })
    return cached.result as T
  }

  // Step 2: Execute operation
  let result: T
  try {
    result = await operation()
  } catch (error) {
    log("error", "domain_operation_failed", {
      idempotencyToken,
      operationType,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  // Step 3: Record that operation was applied
  // CRITICAL: Do this before any other side effects
  await recordOperationApplied(idempotencyToken, operationType, result)

  return result
}

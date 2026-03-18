-- Migration: Add domain-level idempotency tracking
--
-- Purpose: Prevent duplicate effects in domain logic (lead creation, email sending, etc.)
--
-- Explanation:
--   Database-level idempotency (platform_outbox) prevents duplicate *rows* in the outbox.
--   Domain idempotency prevents duplicate *effects* in business logic.
--
--   Example: Two workers both process a "create lead" job with token=X
--   - Both pass database uniqueness (UNIQUE on platform_outbox.idempotency_token)
--   - But database can only prevent one INSERT on platform_outbox
--   - Domain layer ALSO needs to prevent both from executing the business operation
--
--   This table tracks: "We already created lead for request X"
--   Query pattern:
--     1. Check applied_operations table for token
--     2. If exists: return cached result
--     3. If missing: execute domain operation, then INSERT applied_operations
--
-- Design:
--   - idempotency_token: Unique identifier for this request/operation
--   - operation_type: "create_lead", "send_email", etc. (for debugging/auditing)
--   - created_at: When this operation was applied
--   - result: JSON result to return to caller (cached)

CREATE TABLE IF NOT EXISTS applied_operations (
  id BIGSERIAL PRIMARY KEY,
  idempotency_token UUID NOT NULL,
  operation_type VARCHAR(100) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (idempotency_token, operation_type)
);

-- Index for fast lookups by token
CREATE INDEX IF NOT EXISTS idx_applied_operations_token
ON applied_operations (idempotency_token);

-- Index for auditing by operation type
CREATE INDEX IF NOT EXISTS idx_applied_operations_type_created
ON applied_operations (operation_type, created_at DESC);

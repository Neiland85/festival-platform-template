-- Migration: Add UNIQUE constraint on idempotency_token for platform_outbox
--
-- Purpose: Enforce database-level idempotency
--
-- Explanation:
--   The idempotency_token identifies a unique request/operation.
--   With a UNIQUE constraint, only ONE row can exist per token.
--   This prevents application-level race conditions:
--     - Two workers checking idempotency simultaneously
--     - Both find token not 'completed'
--     - Both process the job
--   With UNIQUE constraint, the database enforces exactly-once semantics.
--
-- Behavior:
--   1. If first ackJob() is called with token=X → INSERT/UPDATE succeeds
--   2. If second ackJob() is called with token=X → Database violates UNIQUE
--   3. Application must handle UNIQUE violation (idempotent operation succeeded)

ALTER TABLE platform_outbox
ADD CONSTRAINT unique_idempotency_token UNIQUE (idempotency_token);

-- Create index for faster idempotency lookups
CREATE INDEX idx_platform_outbox_idempotency_token_status
ON platform_outbox (idempotency_token, status)
WHERE status = 'completed';

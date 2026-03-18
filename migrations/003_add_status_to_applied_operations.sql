-- Migration: Add status column to applied_operations for pre-insert idempotency pattern
--
-- Purpose: Track operation state through 'pending' → 'completed' lifecycle
--
-- Explanation:
--   The pre-insert idempotency pattern requires tracking operation status:
--   1. Worker inserts with status='pending' (reserves the operation)
--   2. Worker executes the operation (can crash)
--   3. Worker updates status='completed' (durability point)
--
--   This prevents duplicates: only the first worker to reserve the operation
--   will execute it. Other workers see the pending status and wait/retry.
--
-- Values:
--   'pending': Operation reserved but not yet executed
--   'completed': Operation fully executed and result cached
--

ALTER TABLE applied_operations
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'completed';

-- Update existing rows to 'completed' (they were all recorded after execution)
UPDATE applied_operations
SET status = 'completed'
WHERE status IS NULL;

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_applied_operations_status
ON applied_operations (idempotency_token, operation_type, status);

-- Create index for finding pending operations (for cleanup)
CREATE INDEX IF NOT EXISTS idx_applied_operations_pending
ON applied_operations (status)
WHERE status = 'pending';

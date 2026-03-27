-- 007: Atomic capacity constraint — defense in depth against overselling.
--
-- Even if application logic has a bug, the database will reject any
-- UPDATE that would set tickets_sold > capacity.
--
-- Also adds 'reserved' and 'expired' to the order status lifecycle:
--   reserved  → capacity deducted, awaiting payment
--   completed → payment confirmed, capacity stays deducted
--   expired   → checkout timeout, capacity released
--   cancelled → manual cancel, capacity released
--   refunded  → post-payment refund, capacity released

-- Constraint: tickets_sold can never exceed capacity (when capacity is set)
ALTER TABLE events
  ADD CONSTRAINT chk_no_oversell
  CHECK (capacity IS NULL OR tickets_sold <= capacity);

-- Index for expiration cron: find old reserved orders efficiently
CREATE INDEX IF NOT EXISTS idx_orders_reserved_created
  ON orders (created_at)
  WHERE status = 'reserved';

COMMENT ON CONSTRAINT chk_no_oversell ON events
  IS 'Defense in depth: prevents tickets_sold from exceeding capacity at the database level';

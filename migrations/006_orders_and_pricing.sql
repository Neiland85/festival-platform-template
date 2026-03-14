-- 006: Orders table + pricing columns on events
-- Supports Stripe Checkout with graceful degradation

BEGIN;

-- ── Pricing columns on events ──
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS tickets_sold INTEGER NOT NULL DEFAULT 0;

-- ── Order status enum ──
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Orders table ──
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE,
  event_id VARCHAR(255) NOT NULL REFERENCES events(id),
  customer_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status order_status NOT NULL DEFAULT 'pending',
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);

COMMIT;

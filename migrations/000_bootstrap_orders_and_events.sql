-- 000: Bootstrap — create orders table and add missing events columns.
--
-- Problem: The orders table and several events columns (capacity, tickets_sold,
-- price_cents) are defined in the Drizzle schema and used by domain code, but
-- no migration ever creates them. Migrations 007+ reference these objects and
-- fail on a fresh database.
--
-- This migration is idempotent (IF NOT EXISTS / IF NOT EXISTS) and safe to run
-- on both fresh databases and existing ones where columns may already exist.
--
-- Must run AFTER sql/schema.sql (which creates events and leads)
-- and BEFORE migrations 001–007.

-- ─── Events: add columns required by the order/capacity domain ───

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_cents INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo TEXT;

-- ─── Orders table ───

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE,
  event_id        VARCHAR(255)  NOT NULL REFERENCES events(id),
  customer_email  TEXT          NOT NULL,
  amount_cents    INTEGER       NOT NULL,
  currency        VARCHAR(3)    NOT NULL DEFAULT 'EUR',
  status          VARCHAR(20)   NOT NULL DEFAULT 'reserved',
  quantity        INTEGER       NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- NOTE: status is VARCHAR(20), not a pg enum.
-- The domain uses: reserved, completed, expired, cancelled, refunded.
-- VARCHAR avoids the ALTER TYPE ceremony when adding new statuses.
-- The Drizzle schema defines an enum for documentation, but raw queries
-- write string literals directly — the pg enum is never enforced at runtime
-- because repositories use raw pg, not Drizzle query builder.

CREATE INDEX IF NOT EXISTS idx_orders_event_id    ON orders (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders (created_at);

-- ─── Users table (referenced by leads.created_by in Drizzle schema) ───

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255)  NOT NULL UNIQUE,
  role        VARCHAR(20)   NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── platform_outbox (referenced by migration 001) ───

CREATE TABLE IF NOT EXISTS platform_outbox (
  id                BIGSERIAL PRIMARY KEY,
  idempotency_token UUID,
  operation_type    VARCHAR(100),
  payload           JSONB,
  status            VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

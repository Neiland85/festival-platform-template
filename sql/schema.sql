-- SolarisNerja — Schema v2 (production-ready)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  event_id TEXT NOT NULL,
  ip_address TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  surname TEXT,
  phone TEXT,
  profession TEXT,
  source TEXT NOT NULL DEFAULT 'organic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Idempotent INSERT: ON CONFLICT (email, event_id) DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_event_unique
ON leads (email, event_id);

-- Fast lookup by event
CREATE INDEX IF NOT EXISTS leads_event_id_idx
ON leads (event_id);

-- GDPR: fast lookup by email for data subject requests
CREATE INDEX IF NOT EXISTS leads_email_idx
ON leads (email);

-- Soft-delete filter for active records
CREATE INDEX IF NOT EXISTS leads_active_idx
ON leads (created_at) WHERE deleted_at IS NULL;

-- ───────────────────────────────────────────
-- Events (dashboard-managed)
-- ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  highlight TEXT NOT NULL DEFAULT '',
  ticket_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_active_idx
ON events (active, created_at DESC);

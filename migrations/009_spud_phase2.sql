-- 009: SPUD Phase 2 — memory, segments, outcomes, approval & idempotency
-- Idempotent: safe to run multiple times

-- ── Memory (KV store with TTL) ──

CREATE TABLE IF NOT EXISTS spud_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(50)  NOT NULL DEFAULT 'general',
  memory_key  VARCHAR(255) NOT NULL,
  value       JSONB        NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (category, memory_key)
);

CREATE INDEX IF NOT EXISTS idx_spud_memory_category ON spud_memory (category);
CREATE INDEX IF NOT EXISTS idx_spud_memory_expires  ON spud_memory (expires_at) WHERE expires_at IS NOT NULL;

-- ── Segments (saved filter snapshots) ──

CREATE TABLE IF NOT EXISTS spud_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  filters     JSONB        NOT NULL,
  lead_count  INTEGER      NOT NULL DEFAULT 0,
  created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spud_segments_name ON spud_segments (name);

-- ── Outcomes (conversion tracking) ──

CREATE TABLE IF NOT EXISTS spud_outcomes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              VARCHAR(255) NOT NULL,
  order_id             UUID         NOT NULL,
  score_at_conversion  INTEGER,
  tier_at_conversion   VARCHAR(20),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  converted_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_spud_outcomes_lead      ON spud_outcomes (lead_id);
CREATE INDEX IF NOT EXISTS idx_spud_outcomes_converted ON spud_outcomes (converted_at);

-- ── Runs: add idempotency & approval columns ──

ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS idempotency_key        VARCHAR(255);
ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS approval_status        VARCHAR(20);
ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS approval_requested_by  VARCHAR(100);
ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS approval_decided_by    VARCHAR(100);
ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS approval_decided_at    TIMESTAMPTZ;
ALTER TABLE spud_runs ADD COLUMN IF NOT EXISTS approval_reason        TEXT;

-- Partial unique index: only enforce uniqueness when key is not null
DO $$ BEGIN
  CREATE UNIQUE INDEX idx_spud_runs_idempotency
    ON spud_runs (idempotency_key) WHERE idempotency_key IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX idx_spud_runs_approval
    ON spud_runs (approval_status) WHERE approval_status IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

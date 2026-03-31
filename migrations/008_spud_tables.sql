-- 008: SPUD tables — lead scoring, runs, tasks
-- Idempotent: safe to run multiple times

-- ── Enums ──

DO $$ BEGIN
  CREATE TYPE spud_run_status AS ENUM ('pending','running','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE spud_task_status AS ENUM ('pending','running','completed','failed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Lead Scores ──

CREATE TABLE IF NOT EXISTS spud_lead_scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    VARCHAR(255) NOT NULL REFERENCES leads(id),
  score      INTEGER NOT NULL,
  tier       VARCHAR(20) NOT NULL,
  factors    JSONB NOT NULL DEFAULT '{}',
  run_id     UUID,
  scored_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spud_scores_lead ON spud_lead_scores (lead_id);
CREATE INDEX IF NOT EXISTS idx_spud_scores_tier      ON spud_lead_scores (tier);
CREATE INDEX IF NOT EXISTS idx_spud_scores_scored_at ON spud_lead_scores (scored_at);

-- ── Runs ──

CREATE TABLE IF NOT EXISTS spud_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(50) NOT NULL,
  status        spud_run_status NOT NULL DEFAULT 'pending',
  input         TEXT NOT NULL DEFAULT '{}',
  output        TEXT,
  error         TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor         VARCHAR(100) NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_spud_runs_type       ON spud_runs (type);
CREATE INDEX IF NOT EXISTS idx_spud_runs_status     ON spud_runs (status);
CREATE INDEX IF NOT EXISTS idx_spud_runs_created_at ON spud_runs (created_at);

-- ── Tasks ──

CREATE TABLE IF NOT EXISTS spud_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES spud_runs(id),
  name          VARCHAR(100) NOT NULL,
  action        VARCHAR(50) NOT NULL,
  status        spud_task_status NOT NULL DEFAULT 'pending',
  input         TEXT NOT NULL DEFAULT '{}',
  output        TEXT,
  error         TEXT,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_spud_tasks_run_id ON spud_tasks (run_id);
CREATE INDEX IF NOT EXISTS idx_spud_tasks_status ON spud_tasks (status);

-- 004: Persistent audit log table
-- Stores audit trail events that were previously only in-memory (ring buffer).
-- Enables compliance queries, GDPR traceability, and cross-restart persistence.

CREATE TABLE IF NOT EXISTS audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        VARCHAR(100)  NOT NULL,
  actor         VARCHAR(100)  NOT NULL DEFAULT 'system',
  ip            VARCHAR(45)   NOT NULL DEFAULT 'unknown',
  resource      VARCHAR(255)  NOT NULL DEFAULT '-',
  details       TEXT          NOT NULL DEFAULT '{}',
  request_id    VARCHAR(100)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_action     ON audit_events (action);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor      ON audit_events (actor);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at);

COMMENT ON TABLE audit_events IS 'Persistent audit trail — GDPR compliance, admin action logging';

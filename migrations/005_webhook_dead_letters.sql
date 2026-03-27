-- 005: Dead-letter queue for failed webhook events
-- Captures Stripe (and future provider) webhook events that failed processing.
-- Enables manual retry and audit trail for payment reconciliation.

CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    VARCHAR(50)   NOT NULL DEFAULT 'stripe',
  event_type  VARCHAR(100)  NOT NULL,
  event_id    VARCHAR(255)  NOT NULL,
  payload     TEXT          NOT NULL,
  error       TEXT          NOT NULL,
  attempts    INTEGER       NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_provider   ON webhook_dead_letters (provider);
CREATE INDEX IF NOT EXISTS idx_dlq_event_type ON webhook_dead_letters (event_type);
CREATE INDEX IF NOT EXISTS idx_dlq_resolved   ON webhook_dead_letters (resolved_at);

COMMENT ON TABLE webhook_dead_letters IS 'Dead-letter queue for webhook events that failed processing';

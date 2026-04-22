-- 010: Ticket assets
-- Purpose:
--   Separate operational order truth (orders) from ticket asset representation.
--   This is the bridge to future on-chain issuance without changing checkout logic.

CREATE TABLE IF NOT EXISTS ticket_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id          VARCHAR(255) NOT NULL REFERENCES events(id),
  owner_email       TEXT,
  owner_wallet      TEXT,
  contract_address  TEXT,
  token_id          TEXT,
  chain_id          INTEGER,
  status            VARCHAR(20) NOT NULL DEFAULT 'offchain',
  minted_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_assets_order_id
  ON ticket_assets(order_id);

CREATE INDEX IF NOT EXISTS idx_ticket_assets_event_id
  ON ticket_assets(event_id);

CREATE INDEX IF NOT EXISTS idx_ticket_assets_status
  ON ticket_assets(status);

COMMENT ON TABLE ticket_assets IS
  'Ticket asset layer: offchain first, on-chain ready later';

COMMENT ON COLUMN ticket_assets.status IS
  'offchain | pending_mint | minted | failed';

-- 004: Add profile fields to leads for promo form
-- Fields are nullable to maintain backward compatibility with existing leads

ALTER TABLE leads ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS surname    TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source     TEXT NOT NULL DEFAULT 'organic';

-- Index for filtering by source (organic, promo-entradas-2x1, etc.)
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);

COMMENT ON COLUMN leads.source IS 'Lead origin: organic | promo-entradas-2x1 | landing | etc.';

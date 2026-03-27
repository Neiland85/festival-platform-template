-- 006: Multi-tenancy support — tenant registry table
-- Each tenant gets its own PostgreSQL schema with isolated data.
-- The tenants table in the public schema acts as the central registry.

CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)  NOT NULL,
  slug        VARCHAR(100)  NOT NULL UNIQUE,
  schema_name VARCHAR(63)   NOT NULL UNIQUE,
  domain      VARCHAR(255),
  config      TEXT          NOT NULL DEFAULT '{}',
  active      BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants (domain);

COMMENT ON TABLE tenants IS 'Multi-tenant registry — maps slugs/domains to isolated PostgreSQL schemas';

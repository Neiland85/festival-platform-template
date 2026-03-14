-- RBAC: Users table with roles
-- Roles: admin (full access), editor (CRUD events), viewer (read-only dashboard)

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email) WHERE active = true;
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role) WHERE active = true;

-- Audit: link sessions to users
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

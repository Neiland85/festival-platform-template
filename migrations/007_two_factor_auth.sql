-- 007: Two-Factor Authentication (TOTP)
-- Adds 2FA support to the users table for authenticator app integration.
-- Secrets are stored encrypted (AES-256-GCM), backup codes are SHA-256 hashed.

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN users.totp_secret IS 'AES-256-GCM encrypted TOTP secret for authenticator apps';
COMMENT ON COLUMN users.totp_enabled IS 'Whether 2FA is active for this user';
COMMENT ON COLUMN users.totp_backup_codes IS 'SHA-256 hashed single-use backup codes';
COMMENT ON COLUMN users.totp_verified_at IS 'Timestamp when 2FA was successfully verified and enabled';

-- Audit plan: comprehensive tracing index for instant audits
CREATE INDEX IF NOT EXISTS idx_audit_events_action_created
  ON audit_events (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created
  ON audit_events (actor, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_ip
  ON audit_events (ip);

COMMENT ON INDEX idx_audit_events_action_created IS 'Audit plan: fast lookup by action type for compliance reports';
COMMENT ON INDEX idx_audit_events_actor_created IS 'Audit plan: fast lookup by actor for access reviews';
COMMENT ON INDEX idx_audit_events_ip IS 'Audit plan: IP-based correlation for incident response';

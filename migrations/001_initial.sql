-- Solaris Nerja — Initial schema
-- Execute against your PostgreSQL database (Supabase or direct)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id            VARCHAR(255)  PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT          NOT NULL,
  highlight     VARCHAR(255)  NOT NULL,
  ticket_url    TEXT          NOT NULL,
  active        BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id              VARCHAR(255)  PRIMARY KEY,
  email           VARCHAR(255)  NOT NULL,
  event_id        VARCHAR(255)  NOT NULL REFERENCES events(id),
  ip_address      VARCHAR(45)   NOT NULL,
  consent_given   BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMP     NOT NULL DEFAULT now(),
  UNIQUE(email, event_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_event_id   ON leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

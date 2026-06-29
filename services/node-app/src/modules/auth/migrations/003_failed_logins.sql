-- Failed login attempts, for the admin dashboard "Failed Logins 24h" metric.
-- One row per rejected /auth/login (unknown email or wrong password).
CREATE TABLE IF NOT EXISTS failed_logins (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_created ON failed_logins(created_at DESC);

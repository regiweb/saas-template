ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status     TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_audit_log (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    TEXT,
  actor_id   TEXT,
  type       TEXT         NOT NULL,
  event      TEXT         NOT NULL,
  meta       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_audit_log_user_id_idx ON user_audit_log (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT  PRIMARY KEY,
  value JSONB NOT NULL
);

INSERT INTO app_settings (key, value) VALUES
  ('projectName',      '"EZ Launch"'),
  ('domain',           '"https://ezlaunch.io"'),
  ('timezone',         '"UTC+0"'),
  ('autoDeploy',       'true'),
  ('healthMonitoring', 'true'),
  ('debugMode',        'false'),
  ('force2fa',         'false'),
  ('sessionTimeout',   '60'),
  ('maxLoginAttempts', '5')
ON CONFLICT DO NOTHING;

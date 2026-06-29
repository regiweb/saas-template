-- EZL-FR-004a — IAM schema: roles, permissions, and their assignments.
-- RBAC foundation. No behavior change yet: tables are created empty here;
-- the permission registry, default-role seeding and middleware land in FR-004b.
-- All statements are idempotent so re-running migrations is safe.

-- Registry of known permissions. A permission key is "resource:action"
-- (e.g. users:read, roles:manage). This table is the single source of truth —
-- role_permissions references it, so an unknown permission cannot be granted.
CREATE TABLE IF NOT EXISTS permissions (
  key         TEXT PRIMARY KEY,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A role bundles a set of permissions. System roles (admin, user) are seeded
-- by FR-004b and cannot be deleted or emptied (enforced in handlers, not SQL).
CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions granted to a role (many-to-many). Deleting a role or a
-- permission cascades away its grants.
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

-- Roles assigned to a user (many-to-many). A user's effective permissions are
-- the union of the permissions of all their roles.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

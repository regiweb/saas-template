// EZL-FR-004b — IAM permission registry + pure authorization helpers.
//
// A permission is a "resource:action" string. This file is the single source of
// truth: a permission cannot be granted unless it appears in PERMISSIONS, and the
// seed mirrors this list into the `permissions` table. All exported helpers are
// pure (no DB, no I/O) so the security rules are unit-testable in isolation.

export const PERMISSIONS = [
  { key: 'profile:read',    description: "Read one's own account" },
  { key: 'profile:write',   description: "Update one's own account" },
  { key: 'users:read',      description: 'List and view user accounts' },
  { key: 'users:write',     description: 'Create, edit, block/unblock users' },
  { key: 'users:delete',    description: 'Delete user accounts' },
  { key: 'sessions:read',   description: 'View active sessions' },
  { key: 'sessions:revoke', description: 'Revoke user sessions' },
  { key: 'settings:read',   description: 'View platform settings' },
  { key: 'settings:write',  description: 'Change platform settings' },
  { key: 'metrics:read',    description: 'View infrastructure metrics' },
  { key: 'broadcast:send',  description: 'Send broadcast notifications' },
  { key: 'roles:manage',    description: 'Manage roles, permissions and assignments' },
]

// Fast membership set of every known permission key.
export const PERMISSION_KEYS = new Set(PERMISSIONS.map((p) => p.key))

// System roles are seeded on every boot and cannot be deleted or emptied.
// `admin` always holds the full registry (so new permissions extend it on
// re-seed); `user` holds the minimal own-profile set.
export const SYSTEM_ROLES = {
  admin: { permissions: PERMISSIONS.map((p) => p.key) },
  user:  { permissions: ['profile:read', 'profile:write'] },
}

export function isKnownPermission(key) {
  return PERMISSION_KEYS.has(key)
}

// Effective permissions = union of the permissions of every role the user holds.
// `roles` is an array of objects shaped like { permissions: string[] }.
export function effectivePermissions(roles) {
  const set = new Set()
  for (const role of roles ?? []) {
    for (const key of role?.permissions ?? []) set.add(key)
  }
  return set
}

// Default-deny membership check.
export function hasPermission(effective, perm) {
  return effective instanceof Set ? effective.has(perm) : false
}

// No privilege escalation: an actor may only grant permissions they themselves
// hold. `actorPerms` is a Set; `targetPerms` is an iterable of permission keys.
// Returns false if any requested permission is unknown or not held by the actor.
export function canGrant(actorPerms, targetPerms) {
  if (!(actorPerms instanceof Set)) return false
  for (const key of targetPerms ?? []) {
    if (!PERMISSION_KEYS.has(key)) return false
    if (!actorPerms.has(key)) return false
  }
  return true
}

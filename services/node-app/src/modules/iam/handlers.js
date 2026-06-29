// EZL-FR-004c — admin role-management endpoints (all guarded by roles:manage).
//
// Security invariants enforced here (see permissions.test.js / handlers.test.js):
//  - No privilege escalation: an actor may only create/grant/assign permissions
//    they themselves hold (canGrant against request.permissions).
//  - System roles (admin, user) cannot be edited or deleted.
//  - Lock-out guard: an actor cannot strip their own last path to roles:manage.
import { randomBytes } from 'crypto'
import {
  PERMISSIONS,
  isKnownPermission,
  isSystemRole,
  canGrant,
} from './permissions.js'

function uid(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

function errReply(reply, status, code, message, field) {
  const error = { code, message }
  if (field) error.field = field
  return reply.code(status).send({ error })
}

function mapRole(r) {
  return {
    id: r.id,
    name: r.name,
    isSystem: r.is_system,
    permissions: r.permissions ?? [],
  }
}

async function auditLog(db, { actorId, event, meta }) {
  await db
    .query(
      'INSERT INTO user_audit_log (user_id, actor_id, type, event, meta) VALUES ($1, $2, $3, $4, $5)',
      [actorId, actorId, 'iam', event, meta ?? null],
    )
    .catch(() => {}) // non-fatal: audit table may be absent in minimal builds
}

async function loadRolePermissions(db, roleId) {
  const { rows } = await db.query(
    'SELECT permission_key AS key FROM role_permissions WHERE role_id = $1',
    [roleId],
  )
  return rows.map((r) => r.key)
}

// Validate a permissions payload: must be an array of known keys the actor holds.
// Returns { ok, status, code, message } describing the first failure, or { ok:true }.
function validateGrant(actorPerms, permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0)
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'permissions must be a non-empty array' }
  for (const key of permissions) {
    if (!isKnownPermission(key))
      return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: `unknown permission: ${key}` }
  }
  if (!canGrant(actorPerms, permissions))
    return { ok: false, status: 403, code: 'FORBIDDEN', message: 'cannot grant a permission you do not hold' }
  return { ok: true }
}

// GET /permissions — the registry (for building role-editor UIs).
export async function listPermissions(request, reply) {
  return reply.send({ permissions: PERMISSIONS })
}

// GET /roles — all roles with their permission keys.
export async function listRoles(request, reply) {
  const { rows } = await request.server.db.query(
    `SELECT r.id, r.name, r.is_system,
            COALESCE(array_agg(rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), '{}') AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.name`,
  )
  return reply.send({ roles: rows.map(mapRole) })
}

// POST /roles — create a custom role. Default-deny escalation + name guards.
export async function createRole(request, reply) {
  const db = request.server.db
  const { name, permissions = [] } = request.body ?? {}

  if (typeof name !== 'string' || !name.trim())
    return errReply(reply, 400, 'VALIDATION_ERROR', 'name is required', 'name')
  if (name.length > 50)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'name too long (max 50)', 'name')
  if (isSystemRole(name.trim()))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'name is reserved', 'name')

  const v = validateGrant(request.permissions, permissions)
  if (!v.ok) return errReply(reply, v.status, v.code, v.message, 'permissions')

  const id = uid('role')
  try {
    await db.query('INSERT INTO roles (id, name, is_system) VALUES ($1, $2, FALSE)', [id, name.trim()])
  } catch (err) {
    if (err?.code === '23505')
      return errReply(reply, 409, 'CONFLICT', 'a role with that name already exists', 'name')
    throw err
  }
  for (const key of permissions) {
    await db.query(
      'INSERT INTO role_permissions (role_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, key],
    )
  }
  await auditLog(db, { actorId: request.user.sub, event: 'Role created', meta: `role=${name.trim()}` })
  return reply.code(201).send({ role: { id, name: name.trim(), isSystem: false, permissions } })
}

// PATCH /roles/:id — replace a custom role's permissions. System roles are frozen.
export async function updateRolePermissions(request, reply) {
  const db = request.server.db
  const { id } = request.params
  const { permissions = [] } = request.body ?? {}

  const { rows } = await db.query('SELECT id, name, is_system FROM roles WHERE id = $1', [id])
  const role = rows[0]
  if (!role) return errReply(reply, 404, 'NOT_FOUND', 'role not found')
  if (role.is_system) return errReply(reply, 403, 'FORBIDDEN', 'system roles cannot be modified')

  const v = validateGrant(request.permissions, permissions)
  if (!v.ok) return errReply(reply, v.status, v.code, v.message, 'permissions')

  await db.query('DELETE FROM role_permissions WHERE role_id = $1', [id])
  for (const key of permissions) {
    await db.query(
      'INSERT INTO role_permissions (role_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, key],
    )
  }
  await auditLog(db, { actorId: request.user.sub, event: 'Role permissions updated', meta: `role=${role.name}` })
  return reply.send({ role: { id, name: role.name, isSystem: false, permissions } })
}

// DELETE /roles/:id — delete a custom role (cascades grants + assignments).
export async function deleteRole(request, reply) {
  const db = request.server.db
  const { id } = request.params

  const { rows } = await db.query('SELECT id, name, is_system FROM roles WHERE id = $1', [id])
  const role = rows[0]
  if (!role) return errReply(reply, 404, 'NOT_FOUND', 'role not found')
  if (role.is_system) return errReply(reply, 403, 'FORBIDDEN', 'system roles cannot be deleted')

  await db.query('DELETE FROM roles WHERE id = $1', [id])
  await auditLog(db, { actorId: request.user.sub, event: 'Role deleted', meta: `role=${role.name}` })
  return reply.code(204).send()
}

// POST /users/:id/roles — assign a role to a user. The role's permissions must all
// be grantable by the actor (no escalation by handing out a powerful role).
export async function assignRole(request, reply) {
  const db = request.server.db
  const { id: userId } = request.params
  const { roleId } = request.body ?? {}

  if (typeof roleId !== 'string' || !roleId)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'roleId is required', 'roleId')

  const [roleRes, userRes] = await Promise.all([
    db.query('SELECT id, name FROM roles WHERE id = $1', [roleId]),
    db.query('SELECT id FROM users WHERE id = $1', [userId]),
  ])
  if (!roleRes.rows[0]) return errReply(reply, 404, 'NOT_FOUND', 'role not found', 'roleId')
  if (!userRes.rows[0]) return errReply(reply, 404, 'NOT_FOUND', 'user not found')

  const rolePerms = await loadRolePermissions(db, roleId)
  if (!canGrant(request.permissions, rolePerms))
    return errReply(reply, 403, 'FORBIDDEN', 'cannot assign a role with permissions you do not hold', 'roleId')

  await db.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, roleId],
  )
  await auditLog(db, { actorId: request.user.sub, event: 'Role assigned', meta: `user=${userId} role=${roleRes.rows[0].name}` })
  return reply.code(201).send({ ok: true })
}

// DELETE /users/:id/roles/:roleId — unassign a role. Guards against an actor
// stripping their own last path to roles:manage (self lock-out).
export async function unassignRole(request, reply) {
  const db = request.server.db
  const { id: userId, roleId } = request.params

  if (userId === request.user.sub) {
    const { rows } = await db.query(
      `SELECT DISTINCT rp.permission_key AS key
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND ur.role_id <> $2`,
      [userId, roleId],
    )
    const remaining = new Set(rows.map((r) => r.key))
    if (!remaining.has('roles:manage'))
      return errReply(reply, 403, 'FORBIDDEN', 'cannot remove your own last roles:manage access')
  }

  await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId])
  await auditLog(db, { actorId: request.user.sub, event: 'Role unassigned', meta: `user=${userId} role=${roleId}` })
  return reply.code(204).send()
}

// EZL-FR-004b — requirePermission middleware (default-deny).
//
// Unlike the auth revocation check (which fails OPEN to avoid locking everyone
// out on a Redis blip), authorization fails CLOSED: if we cannot determine a
// user's effective permissions, we deny. Missing permission → 403.
import { requireAuth } from '../auth/middleware.js'

// Effective permissions for a user = union of permissions across all their roles.
export async function loadEffectivePermissions(db, userId) {
  const { rows } = await db.query(
    `SELECT DISTINCT rp.permission_key AS key
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1`,
    [userId],
  )
  return new Set(rows.map((r) => r.key))
}

// Returns a Fastify preHandler that enforces a single permission. Runs requireAuth
// first, then loads (and caches on the request) the user's effective permissions.
export function requirePermission(perm) {
  return async function requirePermissionHandler(request, reply) {
    await requireAuth(request, reply)
    if (reply.sent) return

    try {
      if (!request.permissions) {
        request.permissions = await loadEffectivePermissions(request.server.db, request.user.sub)
      }
    } catch (err) {
      request.server.log.error({ err: err?.message }, '[iam] permission load failed — denying')
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Permission check failed' } })
    }

    if (!request.permissions.has(perm)) {
      return reply.code(403).send({
        error: { code: 'FORBIDDEN', message: `Missing permission: ${perm}` },
      })
    }
  }
}

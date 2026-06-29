// EZL-FR-004c — IAM admin routes. Every mutation (and read) is gated by the
// roles:manage permission via requirePermission (default-deny).
import {
  listPermissions,
  listRoles,
  createRole,
  updateRolePermissions,
  deleteRole,
  assignRole,
  unassignRole,
} from './handlers.js'
import { requirePermission } from './middleware.js'

export async function iamRoutes(fastify) {
  const guard = requirePermission('roles:manage')

  fastify.get('/permissions', { preHandler: guard }, listPermissions)
  fastify.get('/roles', { preHandler: guard }, listRoles)
  fastify.post('/roles', { preHandler: guard }, createRole)
  fastify.patch('/roles/:id', { preHandler: guard }, updateRolePermissions)
  fastify.delete('/roles/:id', { preHandler: guard }, deleteRole)
  fastify.post('/users/:id/roles', { preHandler: guard }, assignRole)
  fastify.delete('/users/:id/roles/:roleId', { preHandler: guard }, unassignRole)
}

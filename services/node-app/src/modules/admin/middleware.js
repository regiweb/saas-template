import { requireAuth } from '../auth/middleware.js'

export async function requireAdmin(request, reply) {
  await requireAuth(request, reply)
  if (reply.sent) return
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } })
  }
}

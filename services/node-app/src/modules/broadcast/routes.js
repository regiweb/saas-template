import { sendBroadcast } from './handlers.js'
import { requireAdmin } from '../admin/middleware.js'

export async function broadcastRoutes(fastify) {
  fastify.post('/', { preHandler: requireAdmin }, sendBroadcast)
}

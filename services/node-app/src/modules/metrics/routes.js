import { metrics } from './handlers.js'
import { requireAdmin } from '../admin/middleware.js'

export async function metricsRoutes(fastify) {
  fastify.get('/', { preHandler: requireAdmin }, metrics)
}

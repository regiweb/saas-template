import { listNotifications, unreadCount, markRead, markAllRead } from './handlers.js'
import { requireAuth } from '../auth/middleware.js'

export async function notificationRoutes(fastify) {
  fastify.get('/', { preHandler: requireAuth }, listNotifications)
  fastify.get('/unread-count', { preHandler: requireAuth }, unreadCount)
  fastify.post('/:id/read', { preHandler: requireAuth }, markRead)
  fastify.post('/read-all', { preHandler: requireAuth }, markAllRead)
}

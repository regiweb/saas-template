import {
  register, login, logout, refresh,
  forgotPassword, resetPassword, me,
} from './handlers.js'
import { requireAuth } from './middleware.js'

export async function authRoutes(fastify) {
  fastify.post('/register', register)
  fastify.post('/login', login)
  fastify.post('/logout', { preHandler: requireAuth }, logout)
  fastify.post('/refresh', refresh)
  fastify.post('/forgot-password', forgotPassword)
  fastify.post('/reset-password', resetPassword)
  fastify.get('/me', { preHandler: requireAuth }, me)
}

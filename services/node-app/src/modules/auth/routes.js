import {
  register, login, logout, refresh,
  forgotPassword, resetPassword, me,
} from './handlers.js'
import { requireAuth } from './middleware.js'
import { rateLimit, LIMITS } from './ratelimit.js'

export async function authRoutes(fastify) {
  // EZL-SECAUDIT-v0.3.0-C2: throttle unauthenticated/abuse-prone endpoints.
  const loginLimit = [
    rateLimit({ keyPrefix: 'login-ip', ...LIMITS.loginIp, by: 'ip' }),
    rateLimit({ keyPrefix: 'login-email', ...LIMITS.loginEmail, by: 'email' }),
  ]
  const registerLimit = rateLimit({ keyPrefix: 'register-ip', ...LIMITS.register, by: 'ip' })
  const forgotLimit = [
    rateLimit({ keyPrefix: 'forgot-ip', ...LIMITS.forgotIp, by: 'ip' }),
    rateLimit({ keyPrefix: 'forgot-email', ...LIMITS.forgotEmail, by: 'email' }),
  ]
  const refreshLimit = rateLimit({ keyPrefix: 'refresh-ip', ...LIMITS.refresh, by: 'ip' })

  fastify.post('/register', { preHandler: registerLimit }, register)
  fastify.post('/login', { preHandler: loginLimit }, login)
  fastify.post('/logout', { preHandler: requireAuth }, logout)
  fastify.post('/refresh', { preHandler: refreshLimit }, refresh)
  fastify.post('/forgot-password', { preHandler: forgotLimit }, forgotPassword)
  fastify.post('/reset-password', resetPassword)
  fastify.get('/me', { preHandler: requireAuth }, me)
}

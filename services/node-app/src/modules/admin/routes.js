import { requireAdmin } from './middleware.js'
import {
  getDashboard, getBusinessMetrics, listUsers, getUserById, updateRole,
  toggleBlock, adminResetPassword, deleteUser, inviteUser,
  getSettings, saveSettings, exportUsers,
  listSessions, revokeSession, revokeUserSessions, revokeBulkSessions,
} from './handlers.js'

export async function adminRoutes(fastify) {
  const pre = { preHandler: requireAdmin }

  fastify.get('/dashboard',               pre, getDashboard)
  fastify.get('/business',                pre, getBusinessMetrics)
  fastify.get('/users',                   pre, listUsers)
  fastify.get('/users/export',            pre, exportUsers)
  fastify.post('/users',                  pre, inviteUser)
  fastify.get('/users/:id',               pre, getUserById)
  fastify.put('/users/:id/role',          pre, updateRole)
  fastify.put('/users/:id/block',         pre, toggleBlock)
  fastify.post('/users/:id/reset-password', pre, adminResetPassword)
  fastify.delete('/users/:id',            pre, deleteUser)
  fastify.get('/sessions',                pre, listSessions)
  fastify.post('/sessions/revoke',        pre, revokeBulkSessions)
  fastify.delete('/sessions/:id',         pre, revokeSession)
  fastify.delete('/sessions',             pre, revokeUserSessions)
  fastify.get('/settings',                pre, getSettings)
  fastify.put('/settings',                pre, saveSettings)
}

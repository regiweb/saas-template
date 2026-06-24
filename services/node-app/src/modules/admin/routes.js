import { requireAdmin } from './middleware.js'
import {
  getDashboard, listUsers, getUserById, updateRole,
  toggleBlock, adminResetPassword, deleteUser, inviteUser,
  getSettings, saveSettings,
} from './handlers.js'

export async function adminRoutes(fastify) {
  const pre = { preHandler: requireAdmin }

  fastify.get('/dashboard',               pre, getDashboard)
  fastify.get('/users',                   pre, listUsers)
  fastify.post('/users',                  pre, inviteUser)
  fastify.get('/users/:id',               pre, getUserById)
  fastify.put('/users/:id/role',          pre, updateRole)
  fastify.put('/users/:id/block',         pre, toggleBlock)
  fastify.post('/users/:id/reset-password', pre, adminResetPassword)
  fastify.delete('/users/:id',            pre, deleteUser)
  fastify.get('/settings',                pre, getSettings)
  fastify.put('/settings',                pre, saveSettings)
}

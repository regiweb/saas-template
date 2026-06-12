import Fastify from 'fastify'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import Redis from 'ioredis'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pool, runMigrations } from './db.js'
import { authRoutes } from './modules/auth/routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.NODE_PORT || 3000

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

await app.register(fjwt, {
  secret: process.env.APP_SECRET || 'dev-secret-change-me',
})

app.decorate('db', pool)
app.decorate('redis', new Redis(process.env.REDIS_URL || 'redis://redis:6379'))

await app.register(authRoutes, { prefix: '/api/auth' })

app.get('/health', async () => ({ status: 'ok', service: 'node', version: '0.1.0' }))

await runMigrations([
  join(__dirname, 'modules/auth/migrations'),
])

await app.listen({ port: PORT, host: '0.0.0.0' })

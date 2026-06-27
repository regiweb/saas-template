import Fastify from 'fastify'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import Redis from 'ioredis'
import { pool, runMigrations } from './db.js'
import { loadModules } from './modules/loader.js'

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

// EZL-MODULE-SPEC: авто-дискавери модулей вместо ручных импортов/register/миграций.
const loaded = await loadModules(app)   // enabled=null => все модули с module.json

app.get('/health', async () => ({ status: 'ok', service: 'node', version: '0.1.0' }))

// inventory наружу — список модулей + requires/optional (для UI EZL-US-020)
app.get('/api/modules', async () => loaded.manifest)

await runMigrations(loaded.migrationsDirs)

await app.listen({ port: PORT, host: '0.0.0.0' })

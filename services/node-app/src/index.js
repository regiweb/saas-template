import Fastify from 'fastify'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import Redis from 'ioredis'
import { pool, runMigrations } from './db.js'
import { loadModules } from './modules/loader.js'

const PORT = process.env.NODE_PORT || 3000

// trustProxy: behind Caddy, request.ip must reflect the real client (X-Forwarded-For)
// so per-IP rate limiting (C2) and session/audit IPs are meaningful, not the proxy IP.
const app = Fastify({ logger: true, trustProxy: true })

await app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

// EZL-SECAUDIT-v0.3.0-C1: refuse to start without a real APP_SECRET.
// A predictable fallback secret lets anyone forge admin JWTs (repo is public).
const APP_SECRET = process.env.APP_SECRET
const WEAK_SECRETS = new Set(['dev-secret-change-me', 'change-me-in-production'])
if (!APP_SECRET || WEAK_SECRETS.has(APP_SECRET)) {
  app.log.fatal(
    'APP_SECRET is missing or set to a known placeholder. Set a strong, unique value ' +
      '(e.g. `openssl rand -hex 32`) in the environment before starting. Refusing to start.',
  )
  process.exit(1)
}
if (APP_SECRET.length < 32) {
  app.log.warn('APP_SECRET is shorter than 32 chars — prefer a longer random secret (`openssl rand -hex 32`).')
}

await app.register(fjwt, { secret: APP_SECRET })

// EZL-SECAUDIT-v0.3.0-M3: baseline security headers on every response. HSTS is
// ignored by browsers over plain HTTP and takes effect once staging/prod is on TLS
// (C3). The API serves JSON only, so a deny-all CSP is safe and blocks framing.
app.addHook('onRequest', async (request, reply) => {
  reply.headers({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })
})

app.decorate('db', pool)
app.decorate('redis', new Redis(process.env.REDIS_URL || 'redis://redis:6379'))

// EZL-MODULE-SPEC: авто-дискавери модулей вместо ручных импортов/register/миграций.
const loaded = await loadModules(app)   // enabled=null => все модули с module.json

app.get('/health', async () => ({ status: 'ok', service: 'node', version: '0.1.0' }))

// inventory наружу — список модулей + requires/optional (для UI EZL-US-020)
app.get('/api/modules', async () => loaded.manifest)

await runMigrations(loaded.migrationsDirs)

// Module seeds run after migrations (idempotent — e.g. initial admin provisioning).
for (const s of loaded.seedFns) {
  try {
    await s.fn(app)
  } catch (err) {
    app.log.error({ err, module: s.name }, '[modules] seed failed')
  }
}

await app.listen({ port: PORT, host: '0.0.0.0' })

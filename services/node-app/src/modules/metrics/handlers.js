import os from 'node:os'

const MB = 1048576

// Ping a dependency and time it; never throw — report ok:false instead.
async function timed(fn) {
  const t0 = Date.now()
  try {
    await fn()
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message?.slice(0, 120) }
  }
}

// GET / — live infrastructure snapshot for the Infra Monitor UI (admin-only).
export async function metrics(request, reply) {
  const server = request.server
  const mem = process.memoryUsage()

  const system = {
    uptimeSec: Math.round(os.uptime()),
    loadavg: os.loadavg().map((n) => Math.round(n * 100) / 100),
    cpus: os.cpus().length,
    memory: {
      totalMb: Math.round(os.totalmem() / MB),
      freeMb: Math.round(os.freemem() / MB),
      usedMb: Math.round((os.totalmem() - os.freemem()) / MB),
    },
    platform: os.platform(),
    nodeVersion: process.version,
  }

  const proc = {
    uptimeSec: Math.round(process.uptime()),
    rssMb: Math.round(mem.rss / MB),
    heapUsedMb: Math.round(mem.heapUsed / MB),
  }

  const [postgres, redis] = await Promise.all([
    timed(() => server.db.query('SELECT 1')),
    timed(() => server.redis.ping()),
  ])

  return reply.send({
    system,
    process: proc,
    services: { postgres, redis },
    ts: new Date().toISOString(),
  })
}

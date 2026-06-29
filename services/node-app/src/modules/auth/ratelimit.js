// EZL-SECAUDIT-v0.3.0-C2: lightweight Redis fixed-window rate limiter for auth.
// No external dependency — uses the shared ioredis client. Throttles per-IP and,
// for login, per-account to make credential-stuffing/brute-force uneconomical.
//
// Limits are env-tunable (sane defaults below). Wiring app_settings.maxLoginAttempts
// is a follow-up (L6) — these defaults already close the brute-force vector.

const n = (envVal, def) => {
  const v = parseInt(envVal ?? '', 10)
  return Number.isFinite(v) && v > 0 ? v : def
}

export const LIMITS = {
  loginIp:     { max: n(process.env.AUTH_LOGIN_IP_MAX, 10),    windowSec: 15 * 60 },
  loginEmail:  { max: n(process.env.AUTH_LOGIN_EMAIL_MAX, 5),  windowSec: 15 * 60 },
  register:    { max: n(process.env.AUTH_REGISTER_IP_MAX, 5),  windowSec: 60 * 60 },
  forgotIp:    { max: n(process.env.AUTH_FORGOT_IP_MAX, 5),    windowSec: 60 * 60 },
  forgotEmail: { max: n(process.env.AUTH_FORGOT_EMAIL_MAX, 3), windowSec: 60 * 60 },
  refresh:     { max: n(process.env.AUTH_REFRESH_IP_MAX, 30),  windowSec: 15 * 60 },
}

// by: 'ip' | 'email' — for 'email' falls back to ip when no email in body.
export function rateLimit({ keyPrefix, max, windowSec, by = 'ip' }) {
  return async function rateLimitPreHandler(request, reply) {
    const server = request.server
    const id =
      by === 'email' && request.body?.email
        ? String(request.body.email).toLowerCase().trim().slice(0, 255)
        : request.ip
    const key = `rl:${keyPrefix}:${id}`

    let count
    try {
      // Atomic INCR + first-hit EXPIRE — guarantees the window key always gets a TTL,
      // even if a failure would otherwise land between a separate INCR and EXPIRE
      // (which would leave the key without expiry and wedge the client at 429).
      count = await server.redis.eval(
        "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c",
        1, key, windowSec,
      )
    } catch (err) {
      // Fail open: never take down auth because the limiter store is unavailable.
      server.log.warn({ err }, '[ratelimit] redis error — allowing request')
      return
    }

    if (count > max) {
      const ttl = await server.redis.ttl(key).catch(() => windowSec)
      reply.header('Retry-After', Math.max(ttl, 1))
      return reply.code(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
      })
    }
  }
}

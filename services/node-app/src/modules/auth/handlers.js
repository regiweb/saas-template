import bcrypt from 'bcrypt'
import { randomBytes, createHmac } from 'crypto'
import { sendPasswordReset } from '../mail/mailer.js'

const BCRYPT_ROUNDS = 12
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60  // 7d
const RESET_TTL_SEC   = 60 * 60            // 1h
const FAILED_LOGINS_RETENTION_DAYS = parseInt(process.env.FAILED_LOGINS_RETENTION_DAYS || '30', 10) || 30

function uid(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

function errReply(reply, status, code, message, field) {
  const error = { code, message }
  if (field) error.field = field
  return reply.code(status).send({ error })
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

async function issueTokens(request, user, { createdAt = null } = {}) {
  const server = request.server
  const jti = uid('rtk')
  const accessToken = server.jwt.sign(
    { sub: user.id, email: user.email, role: user.role, sid: jti },
    { expiresIn: '15m' }
  )
  const refreshToken = server.jwt.sign(
    { sub: user.id, jti },
    { expiresIn: '7d' }
  )
  await server.redis.set(`rtk:${jti}`, user.id, 'EX', REFRESH_TTL_SEC)

  // Best-effort session record — must never block authentication.
  try {
    await server.db.query(
      `INSERT INTO sessions (id, user_id, ip, user_agent, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), NOW())`,
      [jti, user.id, request.ip, (request.headers['user-agent'] || '').slice(0, 300), createdAt]
    )
  } catch (err) {
    server.log.warn({ err }, 'session record insert failed')
  }

  return { accessToken, refreshToken }
}

export async function register(request, reply) {
  const { email, password } = request.body ?? {}

  if (!email)    return errReply(reply, 400, 'VALIDATION_ERROR', 'email is required', 'email')
  if (!password) return errReply(reply, 400, 'VALIDATION_ERROR', 'password is required', 'password')
  if (!isValidEmail(email))  return errReply(reply, 400, 'VALIDATION_ERROR', 'Invalid email format', 'email')
  if (password.length < 8)   return errReply(reply, 400, 'VALIDATION_ERROR', 'Password min 8 characters', 'password')
  if (password.length > 72)  return errReply(reply, 400, 'VALIDATION_ERROR', 'Password max 72 characters', 'password')

  const normalEmail = email.toLowerCase().trim()
  const { rows: existing } = await request.server.db.query(
    'SELECT id FROM users WHERE email = $1', [normalEmail]
  )
  if (existing.length > 0) return errReply(reply, 409, 'USER_EXISTS', 'Email already registered', 'email')

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const { rows: [user] } = await request.server.db.query(
    'INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role, created_at',
    [uid('usr'), normalEmail, hash, 'user']
  )

  const tokens = await issueTokens(request, user)
  return reply.code(201).send({
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.created_at },
    ...tokens,
  })
}

export async function login(request, reply) {
  const { email, password } = request.body ?? {}

  if (!email || !password)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'email and password are required')

  const { rows } = await request.server.db.query(
    'SELECT id, email, role, password FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  )
  const user = rows[0]
  // Always run bcrypt to prevent timing attacks
  const valid = user ? await bcrypt.compare(password, user.password) : await bcrypt.hash(password, BCRYPT_ROUNDS)
  if (!user || !valid || typeof valid !== 'boolean') {
    // EZL-SECAUDIT-v0.3.0-M1: failed_logins only feeds the "failed 24h" dashboard
    // count. Don't accumulate PII — store no email and a keyed hash of the IP
    // (correlatable, not reversible), and opportunistically prune old rows so the
    // table stays bounded without a scheduler.
    const ipHash = createHmac('sha256', process.env.APP_SECRET).update(request.ip || '').digest('hex')
    await request.server.db.query(
      'INSERT INTO failed_logins (email, ip) VALUES (NULL, $1)',
      [ipHash]
    ).catch(() => {})  // best-effort metric, never blocks the response
    if (Math.random() < 0.02) {
      request.server.db.query(
        "DELETE FROM failed_logins WHERE created_at < NOW() - ($1 || ' days')::interval",
        [String(FAILED_LOGINS_RETENTION_DAYS)]
      ).catch(() => {})
    }
    return errReply(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  await request.server.db.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [user.id]
  )
  await request.server.db.query(
    'INSERT INTO user_audit_log (user_id, actor_id, type, event, meta) VALUES ($1, $1, $2, $3, $4)',
    [user.id, 'login', 'Logged in', `IP ${request.ip}`]
  ).catch(() => {})  // non-fatal: table may not exist yet on first login before migration

  const tokens = await issueTokens(request, user)
  return reply.send({
    user: { id: user.id, email: user.email, role: user.role },
    ...tokens,
  })
}

export async function logout(request, reply) {
  const { refreshToken } = request.body ?? {}
  if (!refreshToken)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'refreshToken is required')

  try {
    const payload = request.server.jwt.verify(refreshToken)
    await request.server.redis.del(`rtk:${payload.jti}`)
    await request.server.db.query('DELETE FROM sessions WHERE id = $1', [payload.jti]).catch(() => {})
  } catch {
    return errReply(reply, 401, 'INVALID_TOKEN', 'Refresh token invalid or expired')
  }

  return reply.code(204).send()
}

export async function refresh(request, reply) {
  const { refreshToken } = request.body ?? {}
  if (!refreshToken)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'refreshToken is required')

  let payload
  try {
    payload = request.server.jwt.verify(refreshToken)
  } catch {
    return errReply(reply, 401, 'INVALID_TOKEN', 'Refresh token invalid or expired')
  }

  const userId = await request.server.redis.get(`rtk:${payload.jti}`)
  if (!userId)
    return errReply(reply, 401, 'TOKEN_REUSED', 'Refresh token already used or revoked')

  // Check if revoked by password reset (iat is seconds, revokedAt is ms)
  const revokedAt = await request.server.redis.get(`user_revoked:${userId}`)
  if (revokedAt && payload.iat < parseInt(revokedAt) / 1000) {
    await request.server.redis.del(`rtk:${payload.jti}`)
    return errReply(reply, 401, 'INVALID_TOKEN', 'Token invalidated — please log in again')
  }

  // Preserve original session start time across token rotation, then drop the old row.
  const { rows: oldSession } = await request.server.db.query(
    'SELECT created_at FROM sessions WHERE id = $1', [payload.jti]
  )
  await request.server.redis.del(`rtk:${payload.jti}`)

  const { rows } = await request.server.db.query(
    'SELECT id, email, role FROM users WHERE id = $1', [userId]
  )
  if (!rows[0]) return errReply(reply, 401, 'INVALID_TOKEN', 'User not found')

  const tokens = await issueTokens(request, rows[0], { createdAt: oldSession[0]?.created_at ?? null })
  await request.server.db.query('DELETE FROM sessions WHERE id = $1', [payload.jti]).catch(() => {})
  return reply.send(tokens)
}

export async function forgotPassword(request, reply) {
  const { email } = request.body ?? {}
  if (!email || !isValidEmail(email))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'Valid email is required', 'email')

  const normalEmail = email.toLowerCase().trim()
  const { rows } = await request.server.db.query(
    'SELECT id FROM users WHERE email = $1', [normalEmail]
  )
  if (rows[0]) {
    const token = randomBytes(32).toString('hex')
    await request.server.redis.set(`prt:${token}`, rows[0].id, 'EX', RESET_TTL_SEC)
    await sendPasswordReset(request.server.log, { to: normalEmail, token })
  }

  return reply.send({ message: 'If that email is registered, a reset link has been sent.' })
}

export async function resetPassword(request, reply) {
  const { token, password } = request.body ?? {}

  if (!token)    return errReply(reply, 400, 'VALIDATION_ERROR', 'token is required', 'token')
  if (!password) return errReply(reply, 400, 'VALIDATION_ERROR', 'password is required', 'password')
  if (password.length < 8)  return errReply(reply, 400, 'VALIDATION_ERROR', 'Password min 8 characters', 'password')
  if (password.length > 72) return errReply(reply, 400, 'VALIDATION_ERROR', 'Password max 72 characters', 'password')

  const userId = await request.server.redis.get(`prt:${token}`)
  if (!userId) return errReply(reply, 401, 'INVALID_TOKEN', 'Reset token expired or already used')

  const { rows } = await request.server.db.query('SELECT id FROM users WHERE id = $1', [userId])
  if (!rows[0]) return errReply(reply, 404, 'USER_NOT_FOUND', 'Account no longer exists')

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  await request.server.db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, userId])

  // Invalidate reset token + mark all refresh tokens for this user as revoked
  await request.server.redis.del(`prt:${token}`)
  await request.server.redis.set(`user_revoked:${userId}`, Date.now(), 'EX', REFRESH_TTL_SEC)

  return reply.send({ message: 'Password updated successfully.' })
}

export async function me(request, reply) {
  const { rows } = await request.server.db.query(
    'SELECT id, email, role, created_at FROM users WHERE id = $1',
    [request.user.sub]
  )
  if (!rows[0]) return errReply(reply, 401, 'INVALID_TOKEN', 'User not found')

  return reply.send({
    user: { id: rows[0].id, email: rows[0].email, role: rows[0].role, createdAt: rows[0].created_at },
  })
}

import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const BCRYPT_ROUNDS = 12
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60  // 7d
const RESET_TTL_SEC   = 60 * 60            // 1h

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

async function issueTokens(server, user) {
  const accessToken = server.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: '15m' }
  )
  const jti = uid('rtk')
  const refreshToken = server.jwt.sign(
    { sub: user.id, jti },
    { expiresIn: '7d' }
  )
  await server.redis.set(`rtk:${jti}`, user.id, 'EX', REFRESH_TTL_SEC)
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

  const tokens = await issueTokens(request.server, user)
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
  if (!user || !valid || typeof valid !== 'boolean')
    return errReply(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password')

  const tokens = await issueTokens(request.server, user)
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

  await request.server.redis.del(`rtk:${payload.jti}`)

  const { rows } = await request.server.db.query(
    'SELECT id, email, role FROM users WHERE id = $1', [userId]
  )
  if (!rows[0]) return errReply(reply, 401, 'INVALID_TOKEN', 'User not found')

  return reply.send(await issueTokens(request.server, rows[0]))
}

export async function forgotPassword(request, reply) {
  const { email } = request.body ?? {}
  if (!email || !isValidEmail(email))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'Valid email is required', 'email')

  const { rows } = await request.server.db.query(
    'SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]
  )
  if (rows[0]) {
    const token = randomBytes(32).toString('hex')
    await request.server.redis.set(`prt:${token}`, rows[0].id, 'EX', RESET_TTL_SEC)
    // Email not configured yet — log token for local testing
    request.server.log.info({ resetToken: token }, 'Password reset token (no email configured)')
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

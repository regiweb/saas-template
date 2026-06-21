import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import { sendPasswordReset } from '../mail/mailer.js'

const REFRESH_TTL_SEC = 7 * 24 * 60 * 60

function uid(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

function errReply(reply, status, code, message) {
  return reply.code(status).send({ error: { code, message } })
}

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)    return 'Just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function mapUser(u) {
  return {
    id:        u.id,
    email:     u.email,
    role:      u.role,
    status:    u.status,
    createdAt: u.created_at,
    lastLogin: u.last_login ?? null,
    blockedAt: u.blocked_at ?? null,
  }
}

async function auditLog(db, { userId, actorId, type, event, meta }) {
  await db.query(
    'INSERT INTO user_audit_log (user_id, actor_id, type, event, meta) VALUES ($1, $2, $3, $4, $5)',
    [userId, actorId, type, event, meta ?? null]
  )
}

export async function getDashboard(request, reply) {
  const db = request.server.db
  const [totalRes, newWeekRes, activityRes] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS n FROM users'),
    db.query("SELECT COUNT(*)::int AS n FROM users WHERE created_at > NOW() - INTERVAL '7 days'"),
    db.query(
      'SELECT type, event, meta, created_at FROM user_audit_log ORDER BY created_at DESC LIMIT 20'
    ),
  ])

  return reply.send({
    totalUsers:    totalRes.rows[0].n,
    newUsersWeek:  newWeekRes.rows[0].n,
    activeSessions: 0,
    failedLogins:  0,
    failedDelta:   0,
    uptime:        '99.9%',
    activity: activityRes.rows.map(r => ({
      type:  r.type,
      event: r.event,
      meta:  r.meta ?? '',
      time:  relativeTime(r.created_at),
    })),
  })
}

export async function listUsers(request, reply) {
  const { search = '', role = '', status = '', page = 1 } = request.query
  const perPage = 20
  const offset  = (parseInt(page) - 1) * perPage

  const conditions = []
  const params     = []

  if (search) {
    params.push(`%${search.toLowerCase()}%`)
    conditions.push(`LOWER(email) LIKE $${params.length}`)
  }
  if (role) {
    params.push(role)
    conditions.push(`role = $${params.length}`)
  }
  if (status) {
    params.push(status)
    conditions.push(`status = $${params.length}`)
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const [countRes, usersRes] = await Promise.all([
    request.server.db.query(`SELECT COUNT(*)::int AS n FROM users ${where}`, params),
    request.server.db.query(
      `SELECT id, email, role, status, blocked_at, created_at, last_login
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, perPage, offset]
    ),
  ])

  return reply.send({
    users:   usersRes.rows.map(mapUser),
    total:   countRes.rows[0].n,
    page:    parseInt(page),
    perPage,
  })
}

export async function getUserById(request, reply) {
  const { id } = request.params
  const db = request.server.db

  const { rows } = await db.query(
    'SELECT id, email, role, status, blocked_at, created_at, last_login FROM users WHERE id = $1',
    [id]
  )

  if (!rows[0]) return errReply(reply, 404, 'NOT_FOUND', 'User not found')

  const { rows: logs } = await db.query(
    'SELECT type, event, meta, created_at FROM user_audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [id]
  )

  return reply.send({
    user:     mapUser(rows[0]),
    activity: logs.map(l => ({
      type:  l.type,
      event: l.event,
      meta:  l.meta ?? '',
      time:  relativeTime(l.created_at),
    })),
  })
}

export async function updateRole(request, reply) {
  const { id }   = request.params
  const { role } = request.body ?? {}

  if (!['admin', 'user'].includes(role))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'role must be admin or user')

  const { rowCount } = await request.server.db.query(
    'UPDATE users SET role = $1 WHERE id = $2',
    [role, id]
  )

  if (!rowCount) return errReply(reply, 404, 'NOT_FOUND', 'User not found')

  await auditLog(request.server.db, {
    userId:  id,
    actorId: request.user.sub,
    type:    'role',
    event:   'Role changed',
    meta:    `New role: ${role} · by ${request.user.email}`,
  })

  return reply.send({ ok: true })
}

export async function toggleBlock(request, reply) {
  const { id }      = request.params
  const { blocked } = request.body ?? {}

  if (typeof blocked !== 'boolean')
    return errReply(reply, 400, 'VALIDATION_ERROR', 'blocked must be boolean')

  let rowCount
  if (blocked) {
    ;({ rowCount } = await request.server.db.query(
      "UPDATE users SET status = 'blocked', blocked_at = NOW() WHERE id = $1",
      [id]
    ))
  } else {
    ;({ rowCount } = await request.server.db.query(
      "UPDATE users SET status = 'active', blocked_at = NULL WHERE id = $1",
      [id]
    ))
  }

  if (!rowCount) return errReply(reply, 404, 'NOT_FOUND', 'User not found')

  await auditLog(request.server.db, {
    userId:  id,
    actorId: request.user.sub,
    type:    blocked ? 'block' : 'unblock',
    event:   blocked ? 'Account blocked' : 'Account unblocked',
    meta:    `By ${request.user.email}`,
  })

  if (blocked) {
    await request.server.redis.set(`user_revoked:${id}`, Date.now(), 'EX', REFRESH_TTL_SEC)
  }

  return reply.send({ ok: true })
}

export async function adminResetPassword(request, reply) {
  const { id } = request.params
  const db = request.server.db

  const { rows } = await db.query('SELECT id, email FROM users WHERE id = $1', [id])
  if (!rows[0]) return errReply(reply, 404, 'NOT_FOUND', 'User not found')

  const token = randomBytes(32).toString('hex')
  await request.server.redis.set(`prt:${token}`, id, 'EX', 3600)
  await sendPasswordReset(request.log, { to: rows[0].email, token })

  await auditLog(db, {
    userId:  id,
    actorId: request.user.sub,
    type:    'pw',
    event:   'Password reset',
    meta:    `Initiated by ${request.user.email}`,
  })

  return reply.send({ ok: true, email: rows[0].email })
}

export async function deleteUser(request, reply) {
  const { id } = request.params

  if (id === request.user.sub)
    return errReply(reply, 400, 'SELF_DELETE', 'Cannot delete your own account')

  const { rowCount } = await request.server.db.query(
    'DELETE FROM users WHERE id = $1',
    [id]
  )

  if (!rowCount) return errReply(reply, 404, 'NOT_FOUND', 'User not found')

  await request.server.redis.set(`user_revoked:${id}`, Date.now(), 'EX', REFRESH_TTL_SEC)

  return reply.send({ ok: true })
}

export async function inviteUser(request, reply) {
  const { email, role = 'user' } = request.body ?? {}

  if (!email)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'email is required')
  if (!['admin', 'user'].includes(role))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'role must be admin or user')

  const normalEmail = email.toLowerCase().trim()
  const { rows: existing } = await request.server.db.query(
    'SELECT id FROM users WHERE email = $1', [normalEmail]
  )
  if (existing.length)
    return reply.code(409).send({ error: { code: 'USER_EXISTS', message: 'Email already registered' } })

  const tempPass = randomBytes(16).toString('hex')
  const hash     = await bcrypt.hash(tempPass, 12)
  const userId   = uid('usr')

  const { rows: [user] } = await request.server.db.query(
    'INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role, status, created_at',
    [userId, normalEmail, hash, role]
  )

  const inviteToken = randomBytes(32).toString('hex')
  await request.server.redis.set(`prt:${inviteToken}`, userId, 'EX', 7 * 24 * 3600)
  await sendPasswordReset(request.log, { to: normalEmail, token: inviteToken })

  await auditLog(request.server.db, {
    userId:  userId,
    actorId: request.user.sub,
    type:    'register',
    event:   'Invited',
    meta:    `By ${request.user.email}`,
  })

  return reply.code(201).send({
    ok:   true,
    user: { id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.created_at },
  })
}

export async function getSettings(request, reply) {
  const { rows } = await request.server.db.query('SELECT key, value FROM app_settings ORDER BY key')
  const settings = {}
  for (const { key, value } of rows) settings[key] = value
  return reply.send(settings)
}

export async function saveSettings(request, reply) {
  const updates = request.body ?? {}
  const db = request.server.db

  for (const [key, value] of Object.entries(updates)) {
    await db.query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, JSON.stringify(value)]
    )
  }

  const { rows } = await db.query('SELECT key, value FROM app_settings ORDER BY key')
  const settings = {}
  for (const { key, value } of rows) settings[key] = value
  return reply.send(settings)
}

import { randomBytes } from 'crypto'

function uid(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

function errReply(reply, status, code, message) {
  return reply.code(status).send({ error: { code, message } })
}

// Shared helper — other modules (e.g. admin broadcast) create notifications through this.
export async function createNotification(db, { userId, type = 'info', title, body = null }) {
  const id = uid('ntf')
  await db.query(
    'INSERT INTO notifications (id, user_id, type, title, body) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, String(type).slice(0, 40), String(title).slice(0, 200), body],
  )
  return id
}

// GET / — current user's notifications, newest first, with totals.
export async function listNotifications(request, reply) {
  const userId = request.user.sub
  const limit = Math.min(Math.max(parseInt(request.query.limit ?? '20', 10) || 20, 1), 100)
  const offset = Math.max(parseInt(request.query.offset ?? '0', 10) || 0, 0)

  const { rows } = await request.server.db.query(
    `SELECT id, type, title, body, read_at, created_at
       FROM notifications WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  const { rows: [counts] } = await request.server.db.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread
       FROM notifications WHERE user_id = $1`,
    [userId],
  )

  return reply.send({
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      read: r.read_at != null,
      createdAt: r.created_at,
    })),
    total: counts.total,
    unreadCount: counts.unread,
    limit,
    offset,
  })
}

// GET /unread-count — cheap count for the nav bell badge.
export async function unreadCount(request, reply) {
  const { rows: [c] } = await request.server.db.query(
    'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [request.user.sub],
  )
  return reply.send({ count: c.n })
}

// POST /:id/read — mark one notification read (only the owner's).
export async function markRead(request, reply) {
  const { rowCount } = await request.server.db.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
    [request.params.id, request.user.sub],
  )
  if (!rowCount) {
    const { rows } = await request.server.db.query(
      'SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2',
      [request.params.id, request.user.sub],
    )
    if (!rows[0]) return errReply(reply, 404, 'NOT_FOUND', 'Notification not found')
    // already read — idempotent success
  }
  return reply.send({ ok: true })
}

// POST /read-all — mark all of the current user's notifications read.
export async function markAllRead(request, reply) {
  const { rowCount } = await request.server.db.query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
    [request.user.sub],
  )
  return reply.send({ ok: true, updated: rowCount })
}

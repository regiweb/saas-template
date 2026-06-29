import { broadcastNotification } from '../notifications/handlers.js'

const TARGETS = new Set(['all', 'admin', 'user'])

function errReply(reply, status, code, message, field) {
  const error = { code, message }
  if (field) error.field = field
  return reply.code(status).send({ error })
}

// POST / — admin sends a broadcast that fans out to a notification per targeted user.
export async function sendBroadcast(request, reply) {
  const { title, body = null, target = 'all' } = request.body ?? {}

  if (typeof title !== 'string' || !title.trim())
    return errReply(reply, 400, 'VALIDATION_ERROR', 'title is required', 'title')
  if (title.length > 200)
    return errReply(reply, 400, 'VALIDATION_ERROR', 'title too long (max 200)', 'title')
  if (body != null && (typeof body !== 'string' || body.length > 2000))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'body must be a string up to 2000 chars', 'body')
  if (!TARGETS.has(target))
    return errReply(reply, 400, 'VALIDATION_ERROR', 'target must be all, admin or user', 'target')

  const recipients = await broadcastNotification(request.server.db, {
    target,
    type: 'broadcast',
    title: title.trim(),
    body: body?.trim() ?? null,
  })

  await request.server.db.query(
    'INSERT INTO user_audit_log (user_id, actor_id, type, event, meta) VALUES ($1, $1, $2, $3, $4)',
    [request.user.sub, 'broadcast', 'Broadcast sent', `target=${target} · recipients=${recipients}`],
  ).catch(() => {}) // non-fatal: audit table may be absent in minimal builds

  return reply.code(201).send({ ok: true, target, recipients })
}

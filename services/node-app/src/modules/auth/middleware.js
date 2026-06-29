export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Token missing, malformed, or expired' },
    })
  }

  // EZL-SECAUDIT-v0.3.0-H3: enforce revocation now instead of waiting out the 15-min
  // access-token TTL. Two checks against Redis:
  //  - user_revoked:<sub>  → block / role change / delete / "revoke all sessions"
  //  - rtk:<sid> presence  → single/bulk session revoke and logout (sid = refresh jti)
  const { sub, sid, iat } = request.user ?? {}
  try {
    const revokedAt = await request.server.redis.get(`user_revoked:${sub}`)
    if (revokedAt && iat != null && iat < parseInt(revokedAt, 10) / 1000) {
      return reply.code(401).send({
        error: { code: 'TOKEN_REVOKED', message: 'Session revoked — please log in again' },
      })
    }
    if (sid) {
      const alive = await request.server.redis.exists(`rtk:${sid}`)
      if (!alive) {
        return reply.code(401).send({
          error: { code: 'SESSION_REVOKED', message: 'Session ended — please log in again' },
        })
      }
    }
  } catch (err) {
    // Fail open: a Redis blip must not lock out every authenticated user. Revocation
    // is still guaranteed at token expiry (≤15 min) in the worst case.
    request.server.log.warn({ err: err?.message }, '[auth] revocation check skipped (redis error)')
  }
}

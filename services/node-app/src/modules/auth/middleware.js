export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Token missing, malformed, or expired' },
    })
  }
}

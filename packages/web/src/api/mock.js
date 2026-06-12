const delay = (ms) => new Promise((res) => setTimeout(res, ms))

function fail(code, message, field) {
  const error = { code, message }
  if (field) error.field = field
  return Promise.reject({ error })
}

let users = [
  {
    id: 'usr_mock_1',
    email: 'demo@example.com',
    password: 'demo1234',
    role: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]
let refreshTokens = new Map()
let resetTokens = new Map()

function makeTokenPair(user) {
  const accessToken = `mock_at_${user.id}_${Date.now()}`
  const refreshToken = `mock_rt_${user.id}_${Date.now()}`
  refreshTokens.set(refreshToken, user.id)
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
  }
}

export async function register(email, password) {
  await delay(400)
  if (!email || !password) return fail('VALIDATION_ERROR', 'Email and password required')
  if (users.find((u) => u.email === email)) return fail('USER_EXISTS', 'Email already registered')
  const user = {
    id: `usr_mock_${Date.now()}`,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  return makeTokenPair(user)
}

export async function login(email, password) {
  await delay(400)
  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) return fail('INVALID_CREDENTIALS', 'Wrong email or password')
  return makeTokenPair(user)
}

export async function logout(_accessToken, refreshToken) {
  await delay(200)
  refreshTokens.delete(refreshToken)
  return null
}

export async function refresh(refreshToken) {
  await delay(200)
  const userId = refreshTokens.get(refreshToken)
  if (!userId) return fail('INVALID_TOKEN', 'Refresh token invalid or expired')
  refreshTokens.delete(refreshToken)
  const user = users.find((u) => u.id === userId)
  if (!user) return fail('USER_NOT_FOUND', 'User not found')
  return makeTokenPair(user)
}

export async function me(accessToken) {
  await delay(200)
  const userId = accessToken.split('_')[2]
  const user = users.find((u) => u.id === userId)
  if (!user) return fail('INVALID_TOKEN', 'Invalid token')
  return { user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt } }
}

export async function forgotPassword(email) {
  await delay(500)
  const user = users.find((u) => u.email === email)
  if (user) {
    const token = `mock_reset_${Date.now()}`
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 3_600_000 })
    // eslint-disable-next-line no-console
    console.log('[MOCK] Password reset token:', token)
  }
  return { message: 'If that email is registered, a reset link has been sent.' }
}

export async function resetPassword(token, password) {
  await delay(500)
  const entry = resetTokens.get(token)
  if (!entry || entry.expires < Date.now()) return fail('INVALID_TOKEN', 'Reset token expired or invalid')
  const user = users.find((u) => u.id === entry.userId)
  if (!user) return fail('USER_NOT_FOUND', 'User not found')
  user.password = password
  resetTokens.delete(token)
  return { message: 'Password updated successfully.' }
}

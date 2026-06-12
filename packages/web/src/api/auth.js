const BASE = '/api/auth'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export const register = (email, password) =>
  request('/register', { method: 'POST', body: JSON.stringify({ email, password }) })

export const login = (email, password) =>
  request('/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const logout = (accessToken, refreshToken) =>
  request('/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ refreshToken }),
  })

export const refresh = (refreshToken) =>
  request('/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) })

export const me = (accessToken) =>
  request('/me', { headers: { Authorization: `Bearer ${accessToken}` } })

export const forgotPassword = (email) =>
  request('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })

export const resetPassword = (token, password) =>
  request('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })

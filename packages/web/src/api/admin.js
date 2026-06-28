const BASE = '/api/admin'

async function request(path, accessToken, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export const getDashboard = (token) =>
  request('/dashboard', token)

export const getUsers = (token, { search = '', role = '', status = '', page = 1, perPage = 20 } = {}) =>
  request(`/users?${new URLSearchParams({ search, role, status, page, perPage })}`, token)

export const getUserById = (token, id) =>
  request(`/users/${id}`, token)

export const changeRole = (token, id, role) =>
  request(`/users/${id}/role`, token, { method: 'PUT', body: JSON.stringify({ role }) })

export const blockUser = (token, id) =>
  request(`/users/${id}/block`, token, { method: 'PUT', body: JSON.stringify({ blocked: true }) })

export const unblockUser = (token, id) =>
  request(`/users/${id}/block`, token, { method: 'PUT', body: JSON.stringify({ blocked: false }) })

export const resetPassword = (token, id) =>
  request(`/users/${id}/reset-password`, token, { method: 'POST' })

export const deleteUser = (token, id) =>
  request(`/users/${id}`, token, { method: 'DELETE' })

export const inviteUser = (token, email, role) =>
  request('/users', token, { method: 'POST', body: JSON.stringify({ email, role }) })

// Fetches the CSV with the auth header (can't use a plain <a href>) and
// triggers a browser download.
export async function exportUsers(token) {
  const res = await fetch(`${BASE}/users/export`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  if (!res.ok) throw await res.json().catch(() => ({ error: { message: 'Export failed' } }))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const getSettings = (token) =>
  request('/settings', token)

export const saveSettings = (token, updates) =>
  request('/settings', token, { method: 'PUT', body: JSON.stringify(updates) })

export const getSessions = (token) =>
  request('/sessions', token)

export const revokeSession = (token, id) =>
  request(`/sessions/${id}`, token, { method: 'DELETE' })

export const revokeAllSessions = (token, userId) =>
  request(`/sessions?userId=${encodeURIComponent(userId)}`, token, { method: 'DELETE' })

export const revokeBulkSessions = (token, ids) =>
  request('/sessions/revoke', token, { method: 'POST', body: JSON.stringify({ ids }) })

const BASE = '/api/notifications'

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

export const getNotifications = (token, { limit = 20, offset = 0 } = {}) =>
  request(`/?${new URLSearchParams({ limit, offset })}`, token)

export const getUnreadCount = (token) =>
  request('/unread-count', token)

export const markRead = (token, id) =>
  request(`/${id}/read`, token, { method: 'POST' })

export const markAllRead = (token) =>
  request('/read-all', token, { method: 'POST' })

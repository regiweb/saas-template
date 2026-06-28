const delay = (ms) => new Promise((res) => setTimeout(res, ms))

let mockUsers = [
  { id: 'usr_admin_1', email: 'admin@ezlaunch.io', role: 'admin', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', lastLogin: '2026-06-20T10:00:00.000Z' },
  { id: 'usr_mock_1',  email: 'demo@example.com',  role: 'user',  status: 'active', createdAt: '2026-01-01T00:00:00.000Z', lastLogin: '2026-06-20T09:00:00.000Z' },
  { id: 'usr_2', email: 'anna@corp.io',       role: 'user',  status: 'active',  createdAt: '2026-06-19T14:32:00.000Z', lastLogin: '2026-06-20T09:57:00.000Z' },
  { id: 'usr_3', email: 'max@startup.dev',    role: 'user',  status: 'active',  createdAt: '2026-06-18T10:00:00.000Z', lastLogin: '2026-06-20T08:00:00.000Z' },
  { id: 'usr_4', email: 'dev@company.com',    role: 'user',  status: 'blocked', createdAt: '2026-06-15T09:00:00.000Z', lastLogin: '2026-06-15T10:10:00.000Z', blockedAt: '2026-06-15T10:14:00.000Z' },
  { id: 'usr_5', email: 'sarah@design.co',    role: 'admin', status: 'active',  createdAt: '2026-06-10T08:00:00.000Z', lastLogin: '2026-06-19T18:00:00.000Z' },
  { id: 'usr_6', email: 'jake@freelance.io',  role: 'user',  status: 'active',  createdAt: '2026-06-08T11:00:00.000Z', lastLogin: '2026-06-18T14:00:00.000Z' },
  { id: 'usr_7', email: 'laura@remote.team',  role: 'user',  status: 'blocked', createdAt: '2026-06-05T07:00:00.000Z', lastLogin: '2026-06-10T09:00:00.000Z', blockedAt: '2026-06-12T10:00:00.000Z' },
  { id: 'usr_8', email: 'tom@agency.net',     role: 'user',  status: 'active',  createdAt: '2026-06-01T09:00:00.000Z', lastLogin: '2026-06-19T12:00:00.000Z' },
]

const mockActivity = [
  { type: 'register', actor: 'anna@corp.io',      prefix: null,          verb: 'registered',   meta: 'via /api/auth/register',         time: '2 min ago' },
  { type: 'login',    actor: 'max@startup.dev',   prefix: null,          verb: 'logged in',    meta: 'Session started · IP 91.234.12.5', time: '5 min ago' },
  { type: 'error',    actor: 'unknown@spam.ru',   prefix: 'Failed login', verb: null,           meta: '3 attempts · IP 185.220.101.9',  time: '12 min ago' },
  { type: 'warn',     actor: 'admin@ezlaunch.io', prefix: null,          verb: 'role changed', meta: 'user → admin · by admin',        time: '1 hr ago' },
  { type: 'register', actor: 'dev@company.com',   prefix: null,          verb: 'registered',   meta: 'via /api/auth/register',         time: '2 hr ago' },
]

const mockUserActivity = {
  usr_2: [
    { type: 'login', event: 'Logged in',       meta: 'IP 91.234.12.5 · Chrome / macOS', time: '3 min ago' },
    { type: 'login', event: 'Logged in',       meta: 'IP 91.234.12.5 · Chrome / macOS', time: '2 hr ago' },
    { type: 'pw',    event: 'Password reset',  meta: 'Initiated by admin',               time: '1 day ago' },
    { type: 'role',  event: 'Role changed: guest → user', meta: 'By admin@ezlaunch.io',  time: '19 Jun 2026' },
    { type: 'login', event: 'Registered',      meta: 'via /api/auth/register',           time: '19 Jun 2026' },
  ],
  usr_4: [
    { type: 'block', event: 'Account blocked', meta: 'By admin@ezlaunch.io',             time: '15 Jun 2026' },
    { type: 'login', event: 'Logged in',       meta: 'IP 192.168.1.1',                  time: '15 Jun 2026' },
    { type: 'login', event: 'Registered',      meta: 'via /api/auth/register',           time: '15 Jun 2026' },
  ],
}

const mockSettings = {
  projectName: 'EZ Launch',
  domain: 'https://ezlaunch.io',
  timezone: 'UTC+0',
  autoDeploy: true,
  healthMonitoring: true,
  debugMode: false,
  force2fa: false,
  sessionTimeout: 60,
  maxLoginAttempts: 5,
}

export async function getDashboard(_token) {
  await delay(700)
  return {
    totalUsers: mockUsers.length,
    newUsersWeek: 12,
    activeSessions: 47,
    failedLogins: 23,
    failedDelta: 8,
    uptime: '99.8%',
    activity: mockActivity,
  }
}

export async function getUsers(_token, { search = '', role = '', status = '', page = 1, perPage = 20 } = {}) {
  await delay(500)
  let list = [...mockUsers]
  if (search) list = list.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
  if (role) list = list.filter(u => u.role === role)
  if (status) list = list.filter(u => u.status === status)
  const total = list.length
  const offset = (page - 1) * perPage
  return { users: list.slice(offset, offset + perPage), total, page, perPage }
}

export async function getUserById(_token, id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (!user) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'User not found' } })
  return { user, activity: mockUserActivity[id] ?? [] }
}

export async function blockUser(_token, id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) { user.status = 'blocked'; user.blockedAt = new Date().toISOString() }
  return { ok: true }
}

export async function unblockUser(_token, id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) { user.status = 'active'; delete user.blockedAt }
  return { ok: true }
}

export async function changeRole(_token, id, role) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) user.role = role
  return { ok: true }
}

export async function resetPassword(_token, id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  return { ok: true, email: user?.email }
}

export async function deleteUser(_token, id) {
  await delay(400)
  mockUsers = mockUsers.filter(u => u.id !== id)
  return { ok: true }
}

export async function inviteUser(_token, email, role) {
  await delay(500)
  if (mockUsers.find(u => u.email === email)) {
    return Promise.reject({ error: { code: 'USER_EXISTS', message: 'Email already registered' } })
  }
  const user = { id: `usr_${Date.now()}`, email, role: role || 'user', status: 'active', createdAt: new Date().toISOString(), lastLogin: null }
  mockUsers.push(user)
  return { ok: true, user }
}

export async function getSettings(_token) {
  await delay(500)
  return { ...mockSettings }
}

export async function saveSettings(_token, updates) {
  await delay(600)
  Object.assign(mockSettings, updates)
  return { ...mockSettings }
}

const INITIAL_SESSIONS = [
  {
    id: 'ses_1',
    userId: 'usr_admin_1',
    email: 'admin@ezlaunch.io',
    role: 'admin',
    ip: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    createdAt: '2026-06-27T08:00:00.000Z',
    lastSeenAt: '2026-06-27T10:45:00.000Z',
    current: true,
  },
  {
    id: 'ses_2',
    userId: 'usr_admin_1',
    email: 'admin@ezlaunch.io',
    role: 'admin',
    ip: '10.0.0.5',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    createdAt: '2026-06-26T18:30:00.000Z',
    lastSeenAt: '2026-06-26T22:10:00.000Z',
    current: false,
  },
  {
    id: 'ses_3',
    userId: 'usr_mock_1',
    email: 'demo@example.com',
    role: 'user',
    ip: '91.234.12.5',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    createdAt: '2026-06-27T07:15:00.000Z',
    lastSeenAt: '2026-06-27T10:30:00.000Z',
    current: false,
  },
  {
    id: 'ses_4',
    userId: 'usr_mock_1',
    email: 'demo@example.com',
    role: 'user',
    ip: '91.234.12.5',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    createdAt: '2026-06-25T14:00:00.000Z',
    lastSeenAt: '2026-06-25T16:45:00.000Z',
    current: false,
  },
  {
    id: 'ses_5',
    userId: 'usr_2',
    email: 'anna@corp.io',
    role: 'user',
    ip: '185.56.80.44',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/125.0.0.0 Safari/537.36',
    createdAt: '2026-06-27T09:00:00.000Z',
    lastSeenAt: '2026-06-27T10:55:00.000Z',
    current: false,
  },
  {
    id: 'ses_6',
    userId: 'usr_5',
    email: 'sarah@design.co',
    role: 'admin',
    ip: '78.120.33.9',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    createdAt: '2026-06-26T20:00:00.000Z',
    lastSeenAt: '2026-06-26T23:30:00.000Z',
    current: false,
  },
]

// Module-level working copy — rebuilt on every getSessions() so depleted state
// (e.g. after revoking all sessions + re-login in SPA) never causes empty list.
let mockSessions = INITIAL_SESSIONS.map(s => ({ ...s }))

export async function getSessions(_token) {
  await delay(500)
  mockSessions = INITIAL_SESSIONS.map(s => ({ ...s }))
  return [...mockSessions]
}

export async function revokeSession(_token, id) {
  await delay(400)
  const session = mockSessions.find(s => s.id === id)
  if (!session) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Session not found' } })
  mockSessions = mockSessions.filter(s => s.id !== id)
  return null
}

export async function revokeAllSessions(_token, userId) {
  await delay(500)
  mockSessions = mockSessions.filter(s => s.userId !== userId || s.current)
  return null
}

export async function revokeBulkSessions(_token, ids) {
  await delay(500)
  const idSet = new Set(ids)
  mockSessions = mockSessions.filter(s => !idSet.has(s.id))
  return null
}

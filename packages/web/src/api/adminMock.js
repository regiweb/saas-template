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

export async function getDashboard() {
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

export async function getUsers({ search = '', role = '', status = '', page = 1, perPage = 20 } = {}) {
  await delay(500)
  let list = [...mockUsers]
  if (search) list = list.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
  if (role) list = list.filter(u => u.role === role)
  if (status) list = list.filter(u => u.status === status)
  const total = list.length
  const offset = (page - 1) * perPage
  return { users: list.slice(offset, offset + perPage), total, page, perPage }
}

export async function getUserById(id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (!user) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'User not found' } })
  return { user, activity: mockUserActivity[id] ?? [] }
}

export async function blockUser(id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) { user.status = 'blocked'; user.blockedAt = new Date().toISOString() }
  return { ok: true }
}

export async function unblockUser(id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) { user.status = 'active'; delete user.blockedAt }
  return { ok: true }
}

export async function changeRole(id, role) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  if (user) user.role = role
  return { ok: true }
}

export async function resetPassword(id) {
  await delay(400)
  const user = mockUsers.find(u => u.id === id)
  return { ok: true, email: user?.email }
}

export async function deleteUser(id) {
  await delay(400)
  mockUsers = mockUsers.filter(u => u.id !== id)
  return { ok: true }
}

export async function inviteUser(email, role) {
  await delay(500)
  if (mockUsers.find(u => u.email === email)) {
    return Promise.reject({ error: { code: 'USER_EXISTS', message: 'Email already registered' } })
  }
  const user = { id: `usr_${Date.now()}`, email, role: role || 'user', status: 'active', createdAt: new Date().toISOString(), lastLogin: null }
  mockUsers.push(user)
  return { ok: true, user }
}

export async function getSettings() {
  await delay(500)
  return { ...mockSettings }
}

export async function saveSettings(updates) {
  await delay(600)
  Object.assign(mockSettings, updates)
  return { ...mockSettings }
}

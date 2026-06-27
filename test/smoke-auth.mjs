/**
 * Auth smoke test — runs curl commands on the VM via SSH.
 * Usage: EZL_SSH_PASSPHRASE=*** node test/smoke-auth.mjs
 */
import { NodeSSH } from '../packages/cli/node_modules/node-ssh/lib/esm/index.mjs'

const HOST = process.env.EZL_HOST || '178.236.25.13'
const PORT = parseInt(process.env.EZL_PORT || '2200')
const USER = process.env.EZL_USER || 'ezl'
const KEY  = process.env.EZL_KEY  || (process.env.USERPROFILE || process.env.HOME) + '/.ssh/ezl_ed25519'
const PASS = process.env.EZL_SSH_PASSPHRASE

const BASE  = 'https://localhost/api/auth'
const EMAIL = `smoke-${Date.now()}@test.invalid`
const PWD   = 'Smoke1234!'

const ssh = new NodeSSH()
await ssh.connect({ host: HOST, port: PORT, username: USER, privateKeyPath: KEY, passphrase: PASS || undefined })

let passed = 0, failed = 0

async function curl(method, path, body, token) {
  const headers = ['-H "Content-Type: application/json"']
  if (token) headers.push(`-H "Authorization: Bearer ${token}"`)
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : ''
  const cmd = `curl -sk -o /tmp/sm_body -w "%{http_code}" -X ${method} ${headers.join(' ')} ${bodyArg} ${BASE}${path}`
  const { stdout: code } = await ssh.execCommand(cmd)
  const { stdout: body_raw } = await ssh.execCommand('cat /tmp/sm_body')
  const status = parseInt(code.trim())
  let json = {}
  try { json = body_raw.trim() ? JSON.parse(body_raw.trim()) : {} } catch { json = { _raw: body_raw } }
  return { status, body: json }
}

function check(name, status, expected, body) {
  const ok = status === expected
  console.log(`  ${ok ? '✓' : '✗'} ${name} → ${status}${ok ? '' : ` (expected ${expected})\n    ${JSON.stringify(body)}`}`)
  ok ? passed++ : failed++
  return ok
}

console.log(`\nAuth smoke test  ${BASE}\n`)

// 1. Register
const reg = await curl('POST', '/register', { email: EMAIL, password: PWD })
if (!check('POST /register → 201', reg.status, 201, reg.body)) {
  console.error('  Fatal: cannot continue without registration'); ssh.dispose(); process.exit(1)
}
const { accessToken: regAccess } = reg.body

// 2. Login
const login = await curl('POST', '/login', { email: EMAIL, password: PWD })
check('POST /login → 200', login.status, 200, login.body)
const { accessToken, refreshToken } = login.body

// 3. /me
const me = await curl('GET', '/me', null, accessToken)
check('GET /me → 200', me.status, 200, me.body)

// 4. Refresh
const rfr = await curl('POST', '/refresh', { refreshToken })
check('POST /refresh → 200', rfr.status, 200, rfr.body)

// 4b. Token reuse rejected
const reuse = await curl('POST', '/refresh', { refreshToken })
check('POST /refresh reuse → 401', reuse.status, 401, reuse.body)

// 5. Logout
const lgt = await curl('POST', '/logout', { refreshToken: rfr.body.refreshToken }, rfr.body.accessToken)
check('POST /logout → 204', lgt.status, 204, lgt.body)

ssh.dispose()
console.log(`\n${passed} passed  ${failed} failed`)
if (failed > 0) process.exit(1)

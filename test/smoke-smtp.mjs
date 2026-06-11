/**
 * EZL-SEC-002 SMTP smoke test
 * Uploads mailer.js + updated files to VM, rebuilds, fires forgot-password, checks logs.
 * Usage: EZL_SSH_PASSPHRASE=*** node test/smoke-smtp.mjs
 */
import { NodeSSH } from '../packages/cli/node_modules/node-ssh/lib/esm/index.mjs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')

const SMTP_USER = process.env.SMTP_USER || 'bfd8b52ba9ab1f'
const SMTP_PASS = process.env.SMTP_PASS || 'cae24b1657f503'

const ssh = new NodeSSH()
await ssh.connect({
  host: '178.236.25.13', port: 2200, username: 'ezl',
  privateKeyPath: (process.env.USERPROFILE || process.env.HOME) + '/.ssh/ezl_ed25519',
  passphrase: process.env.EZL_SSH_PASSPHRASE || undefined,
})

async function run(cmd, { silent } = {}) {
  const r = await ssh.execCommand(cmd)
  if (!silent && r.stderr) process.stderr.write(r.stderr.trim() + '\n')
  return r.stdout.trim()
}

console.log('\n── EZL-SEC-002 SMTP smoke test ──\n')

// 1. Upload mailer.js
console.log('1. Uploading mailer.js...')
await run('mkdir -p ~/ezl/services/node-app/src/modules/mail')
await ssh.putFile(
  resolve(ROOT, 'services/node-app/src/modules/mail/mailer.js'),
  '/home/ezl/ezl/services/node-app/src/modules/mail/mailer.js'
)
console.log('   ✓ mailer.js uploaded')

// 2. Upload updated handlers.js (has sendPasswordReset import)
console.log('2. Uploading handlers.js...')
await ssh.putFile(
  resolve(ROOT, 'services/node-app/src/modules/auth/handlers.js'),
  '/home/ezl/ezl/services/node-app/src/modules/auth/handlers.js'
)
console.log('   ✓ handlers.js uploaded')

// 3. Upload package.json (has nodemailer)
console.log('3. Uploading package.json...')
await ssh.putFile(
  resolve(ROOT, 'services/node-app/package.json'),
  '/home/ezl/ezl/services/node-app/package.json'
)
console.log('   ✓ package.json uploaded')

// 4. Patch .env with SMTP vars
console.log('4. Patching .env...')
const setEnv = (k, v) =>
  `grep -q "^${k}=" ~/ezl/.env && sed -i "s|^${k}=.*|${k}=${v}|" ~/ezl/.env || echo "${k}=${v}" >> ~/ezl/.env`
await run(setEnv('SMTP_HOST', 'sandbox.smtp.mailtrap.io'), { silent: true })
await run(setEnv('SMTP_PORT', '587'), { silent: true })
await run(setEnv('SMTP_USER', SMTP_USER), { silent: true })
await run(setEnv('SMTP_PASS', SMTP_PASS), { silent: true })
await run(setEnv('SMTP_FROM', 'noreply@ez-launch.dev'), { silent: true })
await run(setEnv('FRONTEND_URL', 'http://178.236.25.13'), { silent: true })
console.log('   ✓ .env updated')

// 5. Rebuild + restart (installs nodemailer)
console.log('5. docker compose up --build -d  (takes ~60s)...')
const build = await run('cd ~/ezl && docker compose up --build -d 2>&1', { silent: true })
build.split('\n')
  .filter(l => /built|started|created|error|step/i.test(l))
  .slice(-10)
  .forEach(l => console.log('  ', l.trim()))
console.log('   ✓ build done')

// 6. Wait for node-app healthy (up to 40s)
console.log('6. Waiting for node-app...')
let healthy = false
for (let i = 0; i < 40; i++) {
  const s = await run('curl -sk https://localhost/health/node 2>/dev/null || true', { silent: true })
  if (s.includes('"ok"')) { healthy = true; break }
  await new Promise(r => setTimeout(r, 1000))
}
if (!healthy) { console.error('   ✗ node-app not healthy after 40s'); ssh.dispose(); process.exit(1) }
console.log('   ✓ node-app healthy')

// 7. Register test user (ignore 409)
const email = 'smtp-smoke@ez-launch.dev'
const pass  = 'Smoke1234!'
console.log(`7. Ensuring test user (${email})...`)
const regStatus = await run(
  `curl -sk -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" ` +
  `-d '{"email":"${email}","password":"${pass}"}' https://localhost/api/auth/register`,
  { silent: true }
)
console.log(`   register → HTTP ${regStatus}${regStatus === '409' ? ' (user exists, ok)' : ''}`)

// 8. Fire forgot-password
console.log('8. POST /api/auth/forgot-password...')
const resp = await run(
  `curl -sk -w "\\nHTTP %{http_code}" -X POST -H "Content-Type: application/json" ` +
  `-d '{"email":"${email}"}' https://localhost/api/auth/forgot-password`,
  { silent: true }
)
resp.split('\n').forEach(l => console.log('  ', l))

// 9. Logs
console.log('\n9. node-app logs (last 40 lines)...')
const logs = await run('cd ~/ezl && docker compose logs --tail=40 node-app 2>&1', { silent: true })
console.log(logs)

// Verdict
const hasSMTPErr = /ECONNREFUSED|ETIMEDOUT|AuthenticationFailed|535|534/i.test(logs)
const hasSent    = /message sent|250 ok|smtp.*ok|messageId/i.test(logs)
const hasFallback = /dev mode|resetLink/i.test(logs)

console.log('\n── Result ──')
if (hasSMTPErr)   console.log('✗  SMTP error — check credentials or Mailtrap inbox')
else if (hasSent) console.log('✓  Email sent via SMTP — check Mailtrap inbox')
else if (hasFallback) console.log('⚠  Dev-mode fallback — SMTP vars not loaded into container')
else              console.log('?  No clear signal — review logs above')

ssh.dispose()

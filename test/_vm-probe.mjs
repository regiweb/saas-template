import { NodeSSH } from '../packages/cli/node_modules/node-ssh/lib/esm/index.mjs'
const ssh = new NodeSSH()
await ssh.connect({
  host: '178.236.25.13', port: 2200, username: 'ezl',
  privateKeyPath: (process.env.USERPROFILE || process.env.HOME) + '/.ssh/ezl_vm',
})
async function run(cmd) { const r = await ssh.execCommand(cmd); return (r.stdout + r.stderr).trim() }

// Use wget from Caddy container (same docker network, can reach node-app:3000)
const CADDY = 'docker exec ezl-caddy-1'
const BASE  = 'http://node-app:3000/api/auth'

async function wget(path, body) {
  const payload = body ? `--post-data='${JSON.stringify(body)}'` : ''
  const cmd = `${CADDY} wget -qO- --header="Content-Type: application/json" ${payload} ${BASE}${path} 2>&1; echo "EXIT:$?"`
  return run(cmd)
}

const EMAIL = 'smtp-smoke@ez-launch.dev'
const PASS  = 'Smoke1234!'

// 1. Register
console.log('1. Register...')
const reg = await wget('/register', { email: EMAIL, password: PASS })
console.log('  ', reg.slice(0, 200))

// 2. Forgot-password
console.log('\n2. POST /api/auth/forgot-password...')
const fp = await wget('/forgot-password', { email: EMAIL })
console.log('  ', fp)

// 3. Logs
console.log('\n3. node-app logs (last 40 lines)...')
const logs = await run('cd ~/ezl && docker compose logs --tail=40 node-app 2>&1')
console.log(logs)

const hasErr      = /ECONNREFUSED|ETIMEDOUT|535|534|AuthenticationFailed/i.test(logs)
const hasSent     = /message sent|messageId|250 ok/i.test(logs)
const hasFallback = /dev mode|resetLink/i.test(logs)

console.log('\n── Verdict ──')
if (hasErr)           console.log('✗  SMTP error in logs')
else if (hasSent)     console.log('✓  Email sent — check Mailtrap inbox')
else if (hasFallback) console.log('⚠  Dev-mode fallback (SMTP not configured in container)')
else                  console.log('?  No clear signal — review logs')

ssh.dispose()

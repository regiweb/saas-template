import { NodeSSH } from '../packages/cli/node_modules/node-ssh/lib/esm/index.mjs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')

const ssh = new NodeSSH()
await ssh.connect({
  host: '178.236.25.13', port: 2200, username: 'ezl',
  privateKeyPath: (process.env.USERPROFILE || process.env.HOME) + '/.ssh/ezl_ed25519',
  passphrase: process.env.EZL_SSH_PASSPHRASE || undefined,
})
async function run(cmd) { const r = await ssh.execCommand(cmd); return (r.stdout + r.stderr).trim() }

console.log('Uploading fixed handlers.js...')
await ssh.putFile(
  resolve(ROOT, 'services/node-app/src/modules/auth/handlers.js'),
  '/home/ezl/ezl/services/node-app/src/modules/auth/handlers.js'
)
console.log('✓ uploaded')

// No need to rebuild — just restart node-app (code is volume-mounted)
console.log('Restarting node-app...')
console.log(await run('cd ~/ezl && docker compose restart node-app 2>&1'))

// Wait
console.log('Waiting...')
for (let i = 0; i < 20; i++) {
  const s = await run('docker exec ezl-caddy-1 wget -qO- http://node-app:3000/health 2>/dev/null || true')
  if (s.includes('"ok"')) { console.log('✓ healthy'); break }
  await new Promise(r => setTimeout(r, 1000))
}

ssh.dispose()

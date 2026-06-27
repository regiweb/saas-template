/**
 * VM one-time setup: backup dirs, scripts, cron, staging env.
 * Usage: node test/_vm-setup.mjs
 */
import { NodeSSH } from '../packages/cli/node_modules/node-ssh/lib/esm/index.mjs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT  = resolve(__dir, '..')

const ssh = new NodeSSH()
await ssh.connect({
  host: '178.236.25.13', port: 2200, username: 'ezl',
  privateKeyPath: (process.env.USERPROFILE || process.env.HOME) + '/.ssh/ezl_vm',
})
const run = async (cmd) => {
  const r = await ssh.execCommand(cmd)
  return (r.stdout + r.stderr).trim()
}

console.log('[1] Creating backup/log/script dirs')
console.log(await run('mkdir -p ~/ezl/backups ~/ezl/logs ~/ezl/scripts && echo "ok"'))

console.log('\n[2] Uploading postgres-backup.sh')
await ssh.putFile(resolve(ROOT, 'scripts/postgres-backup.sh'), '/home/ezl/ezl/scripts/postgres-backup.sh')
console.log('uploaded postgres-backup.sh')

console.log('\n[3] Uploading postgres-restore.sh')
await ssh.putFile(resolve(ROOT, 'scripts/postgres-restore.sh'), '/home/ezl/ezl/scripts/postgres-restore.sh')
console.log('uploaded postgres-restore.sh')

console.log('\n[4] chmod +x')
console.log(await run('chmod +x ~/ezl/scripts/postgres-backup.sh ~/ezl/scripts/postgres-restore.sh && ls -la ~/ezl/scripts/'))

console.log('\n[5] Manual test backup')
console.log(await run('~/ezl/scripts/postgres-backup.sh 2>&1'))
console.log(await run('ls -lh ~/ezl/backups/ 2>/dev/null'))
console.log(await run('tail -5 ~/ezl/logs/backup.log'))

console.log('\n[6] Cron setup (03:00 UTC daily)')
const cronLine = '0 3 * * * /home/ezl/ezl/scripts/postgres-backup.sh >> /home/ezl/ezl/logs/backup.log 2>&1'
const existing = await run('crontab -l 2>/dev/null || true')
if (existing.includes('postgres-backup')) {
  console.log('Already set:', existing)
} else {
  const r = await ssh.execCommand(`(crontab -l 2>/dev/null; echo "${cronLine}") | crontab -`)
  console.log('Added cron:', (r.stdout + r.stderr).trim() || 'ok')
  console.log('Crontab:', await run('crontab -l'))
}

console.log('\n[7] Create ~/ezl-staging')
console.log(await run('mkdir -p ~/ezl-staging && echo ok'))

console.log('\n[8] Create .env.staging (from prod .env with DB+NODE_ENV overrides)')
const prodEnv = await run('cat ~/ezl/.env')
const stagingEnv = prodEnv.split('\n').map(l => {
  if (l.startsWith('POSTGRES_DB=')) return 'POSTGRES_DB=ezlaunch_staging'
  if (l.startsWith('NODE_ENV=')) return 'NODE_ENV=staging'
  return l
}).join('\n')
const encoded = Buffer.from(stagingEnv).toString('base64')
const wr = await ssh.execCommand(`printf '%s' "${encoded}" | base64 -d > ~/ezl-staging/.env.staging`)
console.log('write result:', (wr.stdout + wr.stderr).trim() || 'ok')
console.log('\n.env.staging:')
console.log(await run('cat ~/ezl-staging/.env.staging'))

ssh.dispose()
console.log('\n=== SETUP COMPLETE ===')

import { NodeSSH } from 'node-ssh'
import { writeFileSync, unlinkSync } from 'fs'

const ssh = new NodeSSH()
await ssh.connect({
  host: '178.236.25.13', port: 2200, username: 'ezl',
  privateKeyPath: 'C:/Users/Oleg/.ssh/ezl_ed25519',
  passphrase: process.env.EZL_SSH_PASSPHRASE || undefined
})

const run = async cmd => { const r = await ssh.execCommand(cmd); return (r.stdout || r.stderr || '').trim() }

// Write the node script locally, upload via sftp, docker cp into container
const script = `import bcrypt from 'bcrypt'
import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const hash = await bcrypt.hash('admin1234', 12)
const res = await client.query("UPDATE users SET password=$1 WHERE email='admin@ezlaunch.io' RETURNING email,role", [hash])
console.log('updated:', JSON.stringify(res.rows[0]), 'hash:', hash.startsWith('$2b$') ? 'ok' : 'bad')
await client.end()
`

writeFileSync('/tmp/fix_pw.mjs', script, 'utf8')
await ssh.putFile('/tmp/fix_pw.mjs', '/tmp/fix_pw.mjs')
unlinkSync('/tmp/fix_pw.mjs')

await run('docker cp /tmp/fix_pw.mjs ezl-staging-node-app-1:/tmp/fix_pw.mjs')
const result = await run('docker exec ezl-staging-node-app-1 node /tmp/fix_pw.mjs')
console.log(result)
await run('docker exec ezl-staging-node-app-1 rm /tmp/fix_pw.mjs')
await run('rm /tmp/fix_pw.mjs')

ssh.dispose()

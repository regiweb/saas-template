import { NodeSSH } from 'node-ssh'
const ssh = new NodeSSH()
await ssh.connect({ host: '178.236.25.13', port: 2200, username: 'ezl', privateKeyPath: 'C:/Users/Oleg/.ssh/ezl_ed25519', passphrase: 'SSHключ' })

// Get node-app container IP
const inspect = await ssh.execCommand(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ezl-node-app-1`)
const ip = inspect.stdout.trim()
console.log('node-app IP:', ip)

// Try direct call
const test = await ssh.execCommand(`curl -s --max-time 3 http://${ip}:3000/health`)
console.log('health direct:', test.stdout)

ssh.dispose()

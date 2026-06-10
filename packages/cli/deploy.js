import chalk from 'chalk'
import { NodeSSH } from 'node-ssh'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'
import inquirer from 'inquirer'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const next = argv[i + 1]
      args[key] = (next && !next.startsWith('--')) ? argv[++i] : true
    }
  }
  return args
}

function expandHome(p) {
  if (p.startsWith('~/') || p === '~') {
    return join(homedir(), p.slice(1))
  }
  return p
}

function step(label) {
  process.stdout.write(chalk.cyan(`→ ${label.padEnd(24)}`))
}

function ok(detail = '') {
  console.log(chalk.green('✓') + (detail ? chalk.dim(` ${detail}`) : ''))
}

function fail(msg) {
  console.log(chalk.red('✗'))
  console.error(chalk.red(`\n${msg}`))
}

export async function deploy(argv) {
  const args = parseArgs(argv)

  const host = args.host
  const port = parseInt(args.port ?? '22', 10)
  const user = args.user ?? 'root'
  const keyPath = expandHome(args.key ?? '~/.ssh/id_rsa')
  let passphrase = args.passphrase ?? null

  if (!host) {
    console.error(chalk.red('Error: --host is required'))
    console.error(chalk.dim('Usage: ezl deploy --host <host> [--port 22] [--user root] [--key ~/.ssh/id_rsa]'))
    process.exit(1)
  }

  if (!existsSync(keyPath)) {
    console.error(chalk.red(`Error: SSH key not found: ${keyPath}`))
    process.exit(1)
  }

  const composeFile = resolve('docker-compose.yml')
  const envFile = resolve('.env')

  if (!existsSync(composeFile)) {
    console.error(chalk.red('Error: docker-compose.yml not found in current directory'))
    process.exit(1)
  }
  if (!existsSync(envFile)) {
    console.error(chalk.red('Error: .env not found in current directory'))
    console.error(chalk.dim('Hint: cp .env.example .env and fill in required values'))
    process.exit(1)
  }

  console.log(chalk.bold('EZ Launch Deploy\n'))
  console.log(chalk.dim(`  Host: ${user}@${host}:${port}`))
  console.log(chalk.dim(`  Key:  ${keyPath}\n`))

  const ssh = new NodeSSH()

  step('Connecting')
  try {
    await ssh.connect({ host, port, username: user, privateKeyPath: keyPath, passphrase: passphrase ?? undefined })
    ok()
  } catch (err) {
    const isEncrypted = err.message.includes('Encrypted private OpenSSH key') || err.message.includes('no passphrase')
    if (isEncrypted && passphrase === null) {
      console.log(chalk.yellow('⚠ key is encrypted'))
      const { entered } = await inquirer.prompt([{
        type: 'password',
        name: 'entered',
        message: 'SSH key passphrase:',
        mask: '*',
      }])
      passphrase = entered
      try {
        await ssh.connect({ host, port, username: user, privateKeyPath: keyPath, passphrase })
        ok()
      } catch (err2) {
        fail(`SSH connection failed: ${err2.message}`)
        process.exit(1)
      }
    } else {
      fail(`SSH connection failed: ${err.message}`)
      process.exit(1)
    }
  }

  try {
    step('Checking Docker')
    const dockerResult = await ssh.execCommand('docker --version 2>&1')
    if (dockerResult.code !== 0 || !dockerResult.stdout.trim()) {
      fail('Docker not found on host\n' + chalk.dim('Install: https://docs.docker.com/engine/install/'))
      process.exit(1)
    }
    ok(dockerResult.stdout.trim())

    const homeResult = await ssh.execCommand('echo $HOME')
    const remoteHome = homeResult.stdout.trim() || `/home/${user}`
    const remoteDir = `${remoteHome}/ezl`
    await ssh.execCommand(`mkdir -p ${remoteDir}/services`)

    step('Uploading config')
    await ssh.putFiles([
      { local: composeFile, remote: `${remoteDir}/docker-compose.yml` },
      { local: envFile, remote: `${remoteDir}/.env` },
    ])
    const caddyFile = resolve('Caddyfile')
    if (existsSync(caddyFile)) {
      await ssh.putFile(caddyFile, `${remoteDir}/Caddyfile`)
    }
    ok('docker-compose.yml, .env, Caddyfile')

    step('Uploading sources')
    const servicesDir = resolve('services')
    if (existsSync(servicesDir)) {
      const uploaded = await ssh.putDirectory(servicesDir, `${remoteDir}/services`, {
        recursive: true,
        concurrency: 5,
        validate: (itemPath) => {
          const name = itemPath.replace(/\\/g, '/').split('/').pop()
          return !['node_modules', '__pycache__', '.git', '.DS_Store', '.env'].includes(name)
        },
      })
      if (!uploaded) {
        fail('Failed to upload some source files')
        process.exit(1)
      }
    }
    ok('services/')

    step('Building images')
    console.log(chalk.dim('  (this may take a few minutes on first run)'))
    const buildResult = await ssh.execCommand('docker compose build 2>&1', { cwd: remoteDir })
    if (buildResult.code !== 0) {
      fail(`docker compose build failed:\n${chalk.dim(buildResult.stdout)}`)
      process.exit(1)
    }
    ok()

    step('Starting services')
    await ssh.execCommand('docker compose down 2>&1', { cwd: remoteDir })
    // Stop any containers that hold port 80 (e.g. a previous deploy under a different project name)
    await ssh.execCommand('docker ps -q --filter publish=80 | xargs -r docker stop 2>/dev/null; true')
    const upResult = await ssh.execCommand('docker compose up -d 2>&1', { cwd: remoteDir })
    if (upResult.code !== 0) {
      fail(`docker compose up failed:\n${chalk.dim(upResult.stdout)}`)
      process.exit(1)
    }
    ok()

    step('Health check')
    await new Promise(r => setTimeout(r, 3000))
    const healthResult = await ssh.execCommand(
      `curl -sf --max-time 5 http://localhost/health && echo OK || echo FAIL`
    )
    if (healthResult.stdout.trim().endsWith('FAIL')) {
      console.log(chalk.yellow('⚠ not responding yet (services may still be starting)'))
    } else {
      ok(healthResult.stdout.replace(/\n?OK$/, '').trim() || 'http://' + host + '/health')
    }

    console.log(chalk.cyan('\n→ Service status:\n'))
    const psResult = await ssh.execCommand('docker compose ps', { cwd: remoteDir })
    console.log(chalk.dim(psResult.stdout))

    console.log(chalk.green.bold('✓ Deploy complete!'))
    console.log(chalk.dim(`  http://${host}/health`))
  } finally {
    ssh.dispose()
  }
}

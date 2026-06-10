import inquirer from 'inquirer'
import { randomBytes } from 'crypto'

export async function runWizard(defaultName) {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
      validate: v => v.trim() !== '' || 'Project name is required'
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Domain (for Caddy reverse proxy):',
      default: 'localhost'
    },
    {
      type: 'password',
      name: 'postgresPassword',
      message: 'Postgres password:',
      mask: '*',
      validate: v => v.trim() !== '' || 'Password is required'
    },
    {
      type: 'input',
      name: 'appSecret',
      message: 'App secret (Enter to auto-generate):',
      default: randomBytes(24).toString('hex')
    },
    {
      type: 'list',
      name: 'nodeEnv',
      message: 'Environment:',
      choices: ['development', 'production'],
      default: 'development'
    }
  ])
}

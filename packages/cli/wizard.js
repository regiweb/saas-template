import inquirer from 'inquirer'
import { randomBytes } from 'crypto'
import { listModules, expandSelection } from './modules.js'

export async function runWizard(defaultName) {
  const mods = listModules()
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
      validate: v => v.trim() !== '' || 'Project name is required'
    },
    {
      type: 'checkbox',
      name: 'modules',
      message: 'Modules to include:',
      choices: mods.map(m => ({
        name: m.name
          + (m.requires?.length ? ` (requires: ${m.requires.join(', ')})` : '')
          + (m.type === 'util' ? ' [util]' : ''),
        value: m.name,
        checked: m.name === 'auth',
      })),
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

  // EZL-US-010: расширяем выбор до замыкания requires (admin -> +auth) + валидация
  answers.modules = expandSelection(answers.modules)
  return answers
}

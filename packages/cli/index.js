#!/usr/bin/env node
import chalk from 'chalk'

const [,, command, ...rest] = process.argv

if (command === 'init') {
  const { runWizard } = await import('./wizard.js')
  const { generate } = await import('./generator.js')

  const projectArg = rest[0]
  console.log(chalk.bold('EZ Launch v0.1.0\n'))

  const answers = await runWizard(projectArg ?? 'my-ezl-app')

  try {
    await generate(answers.projectName, answers)
    console.log(chalk.green(`\nProject "${answers.projectName}" created.`))
    console.log(chalk.dim(`  cd ${answers.projectName} && make up`))
  } catch (err) {
    console.error(chalk.red(`\nError: ${err.message}`))
    process.exit(1)
  }
} else if (command === 'deploy') {
  const { deploy } = await import('./deploy.js')
  await deploy(rest)
} else {
  console.error(chalk.red('Unknown command: ' + (command ?? '(none)')))
  console.error('')
  console.error(chalk.bold('Usage:'))
  console.error(chalk.dim('  ez-launch init [project-name]'))
  console.error(chalk.dim('  ez-launch deploy --host <host> [--port 22] [--user root] [--key ~/.ssh/id_rsa]'))
  process.exit(1)
}

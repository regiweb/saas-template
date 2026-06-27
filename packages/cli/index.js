#!/usr/bin/env node
import chalk from 'chalk'

const [,, command, ...rest] = process.argv

if (command === 'init') {
  const { runWizard } = await import('./wizard.js')
  const { generate } = await import('./generator.js')
  const { banner, printSummary } = await import('./ui.js')

  const projectArg = rest[0]
  banner()

  const answers = await runWizard(projectArg ?? 'my-ezl-app')

  try {
    await generate(answers.projectName, answers)
    printSummary(answers, answers.rawModules)
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

// packages/cli/ui.js — banner + summary для `ez-launch init` (EZL-US-011)
import chalk from 'chalk'
import { listModules } from './modules.js'

const VERSION = '0.1.0'

// ── Banner ────────────────────────────────────────────────────────────────────

export function banner() {
  // inner = 44 → frame width 48 total (╔ + 46×═ + ╗)
  const inner = 44
  const hr = '═'.repeat(inner + 2)

  // Compute padding on plain-text lengths so ANSI codes don't throw off alignment
  const row1text = '  EZ LAUNCH  v' + VERSION          // 19 chars → pad 27
  const row2text = '  SaaS scaffold, batteries included' // 35 chars → pad 11
  const pad1 = ' '.repeat(inner + 2 - row1text.length)
  const pad2 = ' '.repeat(inner + 2 - row2text.length)

  console.log('')
  console.log(chalk.cyan('╔' + hr + '╗'))
  console.log(
    chalk.cyan('║') +
    chalk.bold.white('  EZ LAUNCH') +
    chalk.dim('  v' + VERSION) +
    pad1 +
    chalk.cyan('║')
  )
  console.log(
    chalk.cyan('║') +
    chalk.dim('  SaaS scaffold, batteries included') +
    pad2 +
    chalk.cyan('║')
  )
  console.log(chalk.cyan('╚' + hr + '╝'))
  console.log('')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the name of the first module in `selected` whose `requires` list
// contains `name` — i.e. who pulled `name` in via closure.
function findAddedBy(name, selected, modMap) {
  for (const other of selected) {
    if (modMap.get(other)?.requires?.includes(name)) return other
  }
  return null
}

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * Print the post-generation summary.
 *
 * @param {object}   answers    - Final wizard answers (modules already expanded).
 * @param {string[]} rawModules - Module names as chosen by the user *before*
 *                               expandSelection ran (used to detect auto-added).
 */
export function printSummary(answers, rawModules) {
  const allMods = listModules()
  const modMap  = new Map(allMods.map(m => [m.name, m]))
  const selected = answers.modules ?? []
  const rawSet   = new Set(rawModules ?? [])

  // ── Header ──────────────────────────────────────────────────────────────────
  console.log(chalk.bold.green('\n  ✔  Project created successfully\n'))

  // ── Config ──────────────────────────────────────────────────────────────────
  console.log(chalk.dim('  Project  ') + chalk.white(answers.projectName))
  console.log(chalk.dim('  Domain   ') + chalk.white(answers.domain))
  console.log(chalk.dim('  Env      ') + chalk.white(answers.nodeEnv))

  // ── Modules table ────────────────────────────────────────────────────────────
  if (selected.length === 0) {
    console.log(chalk.dim('\n  No modules selected — bare scaffold.\n'))
  } else {
    const CN = 12  // name column width
    const CP = 22  // prefix column width

    console.log('')
    console.log(chalk.dim('  ' + 'Module'.padEnd(CN) + 'Prefix'.padEnd(CP) + 'Note'))
    console.log(chalk.dim('  ' + '─'.repeat(CN + CP + 24)))

    for (const name of selected) {
      const mod    = modMap.get(name)
      const prefix = mod?.prefix ?? (mod?.type === 'util' ? 'util' : '—')
      const isAdded  = !rawSet.has(name)
      const addedBy  = isAdded ? findAddedBy(name, selected, modMap) : null
      const note     = addedBy ? chalk.yellow(`(added: required by ${addedBy})`) : ''

      console.log(
        '  ' +
        chalk.white(name.padEnd(CN)) +
        chalk.dim(prefix.padEnd(CP)) +
        note
      )
    }
    console.log('')
  }

  // ── Next steps ───────────────────────────────────────────────────────────────
  const base = answers.domain === 'localhost'
    ? 'http://localhost'
    : `https://${answers.domain}`

  const withPrefix = selected.filter(n => modMap.get(n)?.prefix)

  console.log(chalk.bold('  Next steps:\n'))
  console.log('    ' + chalk.cyan(`cd ${answers.projectName}`))
  console.log('    ' + chalk.cyan('make up'))
  console.log('')
  console.log(chalk.dim('  URLs:'))

  for (const name of withPrefix) {
    console.log(chalk.dim(`    ${base}${modMap.get(name).prefix}`))
  }
  console.log(chalk.dim(`    ${base}/health/node`))
  console.log(chalk.dim(`    ${base}/health/python`))
  console.log('')
}

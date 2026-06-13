/**
 * Browser smoke test — Register → Welcome flow, no console errors.
 * Uses VITE_USE_MOCK=true so no backend required.
 * Usage: node test/smoke-browser.mjs
 */
import { chromium } from '../packages/web/node_modules/playwright/index.mjs'
import { spawn, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { setTimeout as sleep } from 'timers/promises'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(__dirname, '..', 'packages', 'web')
const TIMEOUT_MS = 30_000

// ── Start Vite dev server ─────────────────────────────────────────────────────
// Use 'npm' (Windows-safe) instead of node_modules/.bin/vite (bash script)
const vite = spawn('npm', ['run', 'dev', '--', '--port', '5179'], {
  cwd: WEB_DIR,
  env: { ...process.env, VITE_USE_MOCK: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,   // needed on Windows so npm.cmd resolves correctly
})

function killVite() {
  // On Windows, kill the entire process tree (npm spawns child vite process)
  if (process.platform === 'win32') {
    try { execSync(`taskkill /PID ${vite.pid} /T /F`, { stdio: 'ignore' }) } catch {}
  } else {
    try { vite.kill('SIGTERM') } catch {}
  }
}

// Parse actual port from Vite's "Local: http://localhost:PORT/" output line
let actualPort = null
const BASE = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('Vite did not start within 30s')), TIMEOUT_MS)

  function onChunk(chunk) {
    const s = chunk.toString()
    process.stdout.write('[vite] ' + s)  // debug output
    // Strip ANSI escape codes before matching (Vite emits colored output)
    const plain = s.replace(/\x1b\[[0-9;]*m/g, '')
    const m = plain.match(/Local:\s+http:\/\/localhost:(\d+)/)
    if (m) {
      actualPort = m[1]
      clearTimeout(t)
      resolve(`http://localhost:${actualPort}`)
    }
  }

  vite.stdout.on('data', onChunk)
  vite.stderr.on('data', onChunk)
  vite.on('error', (err) => { clearTimeout(t); reject(err) })
  vite.on('exit', (code) => { clearTimeout(t); reject(new Error(`Vite exited with code ${code}`)) })
}).catch(err => { killVite(); throw err })

await sleep(300)   // brief settle

// ── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`)
    failed++
  }
  return ok
}

// ── Run browser tests ─────────────────────────────────────────────────────────
const browser  = await chromium.launch({ headless: true })
const context  = await browser.newContext()
const page     = await context.newPage()

const pageErrors  = []   // window.onerror / unhandledrejection
const consoleErrs = []   // console.error

page.on('pageerror',  err => pageErrors.push(err.message))
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrs.push(msg.text())
})

console.log(`\nBrowser smoke  VITE_USE_MOCK=true  ${BASE}\n`)

try {
  // 1. Load /register
  const resp = await page.goto(`${BASE}/register`, { waitUntil: 'networkidle', timeout: 15_000 })
  check('GET /register → 200', resp?.ok(), `status=${resp?.status()}`)

  // 2. Fill and submit
  await page.fill('input[type="email"]',    `smoke-${Date.now()}@test.invalid`)
  await page.fill('input[type="password"]', 'Smoke1234!')

  // 3. Submit → wait for /welcome
  await Promise.all([
    page.waitForURL(`${BASE}/welcome`, { timeout: 10_000 }),
    page.click('button[type="submit"]'),
  ])
  check('Register → /welcome', page.url().endsWith('/welcome'), `url=${page.url()}`)

  await sleep(400)   // let React finish painting

  // 4. insertBefore / NotFoundError (the target bug)
  const insertBeforeErr = pageErrors.find(e =>
    e.includes('insertBefore') || e.includes('NotFoundError') || e.includes('is not a child')
  )
  check('No insertBefore / NotFoundError', !insertBeforeErr, insertBeforeErr ?? '')

  // 5. No other React crashes
  const reactCrash = pageErrors.find(e =>
    e.includes('Minified React') || e.includes('Maximum update depth')
  )
  check('No React runtime crash', !reactCrash, reactCrash ?? '')

  // 6. Welcome page rendered (auth-body present)
  const bodyVisible = await page.locator('.auth-body').isVisible().catch(() => false)
  check('Welcome auth-body visible', bodyVisible)

  // 7. No critical console errors
  const criticalConsole = consoleErrs.filter(e =>
    e.includes('insertBefore') || e.includes('NotFoundError')
  )
  check('No insertBefore in console.error', criticalConsole.length === 0,
    criticalConsole.join('; '))

} catch (err) {
  console.log(`  ✗ Unexpected error: ${err.message}`)
  failed++
  if (pageErrors.length)  console.log('  page errors:', pageErrors)
  if (consoleErrs.length) console.log('  console errors:', consoleErrs)
} finally {
  await browser.close()
  killVite()
}

console.log(`\n${passed} passed  ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)

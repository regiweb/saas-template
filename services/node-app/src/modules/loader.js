// modules/loader.js — авто-дискавери модулей (EZL-MODULE-SPEC).
// Ядро больше не импортирует модули поимённо: сканируем modules/*/module.json,
// валидируем зависимости, топо-сортируем по requires, регистрируем routes и собираем миграции.
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MODULES_DIR = dirname(fileURLToPath(import.meta.url))

// 1) inventory: какие модули вообще есть (папка + module.json)
export function inventory() {
  const out = []
  for (const d of readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const mf = join(MODULES_DIR, d.name, 'module.json')
    if (!existsSync(mf)) continue
    let m
    try { m = JSON.parse(readFileSync(mf, 'utf8')) }
    catch (e) { throw new Error(`module.json модуля "${d.name}" не парсится: ${e.message}`) }
    if (m.name !== d.name) {
      throw new Error(`module.json: name "${m.name}" != имя папки "${d.name}"`)
    }
    m.__dir = join(MODULES_DIR, d.name)
    out.push(m)
  }
  return out
}

// 2) валидация + топо-сортировка по requires. enabled=null => все найденные.
export function resolveOrder(mods, enabled = null) {
  const byName = Object.fromEntries(mods.map(m => [m.name, m]))
  const want = enabled ?? mods.map(m => m.name)

  const sorted = []
  const visiting = new Set()
  const done = new Set()

  const visit = (name, chain) => {
    if (done.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`Цикл зависимостей: ${[...chain, name].join(' -> ')}`)
    }
    const m = byName[name]
    if (!m) {
      const by = chain.length ? ` (требует "${chain[chain.length - 1]}")` : ''
      throw new Error(`Модуль "${name}" не найден${by}. Проверь requires / наличие module.json.`)
    }
    visiting.add(name)
    for (const dep of (m.requires || [])) visit(dep, [...chain, name])
    // optional не блокирует: предупредим, если нет, но не валим
    for (const opt of (m.optional || [])) {
      if (!byName[opt]) console.warn(`[modules] ${name}: optional-модуль "${opt}" отсутствует — связанная фича выключена`)
    }
    visiting.delete(name)
    done.add(name)
    sorted.push(m)
  }

  for (const n of want) visit(n, [])
  return sorted
}

// 3) загрузка: register routes по манифесту, сбор миграций в порядке зависимостей.
export async function loadModules(app, { enabled = null } = {}) {
  const order = resolveOrder(inventory(), enabled)
  const migrationsDirs = []

  for (const m of order) {
    for (const e of (m.env || [])) {
      if (!process.env[e]) app.log.warn(`[modules] ${m.name}: env ${e} не задан`)
    }
    if (m.routes && m.export) {
      const url = pathToFileURL(join(m.__dir, m.routes)).href
      const ns = await import(url)
      const fn = ns[m.export] ?? ns.default
      if (typeof fn !== 'function') {
        throw new Error(`Модуль "${m.name}": экспорт "${m.export}" не найден или не функция в ${m.routes}`)
      }
      await app.register(fn, m.prefix ? { prefix: m.prefix } : {})
    }
    if (m.migrations) migrationsDirs.push(join(m.__dir, m.migrations))
    app.log.info(`[modules] загружен: ${m.name}${m.prefix ? ' @ ' + m.prefix : ' (util)'}`)
  }

  return {
    names: order.map(m => m.name),
    migrationsDirs,
    // для GET /api/modules и UI (EZL-US-020): голый список зависимостей
    manifest: order.map(m => ({
      name: m.name,
      prefix: m.prefix ?? null,
      type: m.type ?? 'service',
      requires: m.requires ?? [],
      optional: m.optional ?? [],
    })),
  }
}

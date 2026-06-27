// modules.js — инвентаризация и выбор модулей для `ez-launch init` (EZL-US-010).
// Источник модулей — шаблон node-app (in-repo). Логика зависимостей переиспользует
// resolveOrder из загрузчика (единый источник правды, без дублирования топо-сорта).
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveOrder } from '../../services/node-app/src/modules/loader.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// папка-источник модулей в шаблоне
export const MODULES_SRC = join(HERE, '..', '..', 'services', 'node-app', 'src', 'modules')

// все модули шаблона (папка + module.json)
export function listModules() {
  const out = []
  for (const d of readdirSync(MODULES_SRC, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const mf = join(MODULES_SRC, d.name, 'module.json')
    if (!existsSync(mf)) continue
    out.push(JSON.parse(readFileSync(mf, 'utf8')))
  }
  return out
}

// расширяет выбор пользователя до транзитивного замыкания requires + валидирует
// (admin -> добавит auth; битый requires / цикл -> бросит понятную ошибку)
export function expandSelection(picked) {
  return resolveOrder(listModules(), picked).map(m => m.name)
}

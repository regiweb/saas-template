// loader.test.js — юнит-тесты резолвера зависимостей (EZL-MODULE-SPEC).
// Гоняется через `npm test` (node --test). Чистая логика resolveOrder: без fs, без сети.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveOrder } from './loader.js'

test('топо-сортировка: зависимость раньше зависящего (auth < admin)', () => {
  const mods = [
    { name: 'admin', requires: ['auth'] },
    { name: 'auth', requires: [] },
    { name: 'mail', requires: [] },
  ]
  const order = resolveOrder(mods).map(m => m.name)
  assert.ok(order.indexOf('auth') < order.indexOf('admin'), `auth должен идти раньше admin: [${order}]`)
})

test('fail-fast: requires на несуществующий модуль', () => {
  const mods = [{ name: 'admin', requires: ['auth'] }] // auth отсутствует
  assert.throws(() => resolveOrder(mods), /не найден/)
})

test('fail-fast: цикл зависимостей', () => {
  const mods = [
    { name: 'a', requires: ['b'] },
    { name: 'b', requires: ['a'] },
  ]
  assert.throws(() => resolveOrder(mods), /Цикл/)
})

test('enabled-фильтр: берёт только запрошенное + транзитивные зависимости', () => {
  const mods = [
    { name: 'admin', requires: ['auth'] },
    { name: 'auth', requires: [] },
    { name: 'mail', requires: [] },
  ]
  const order = resolveOrder(mods, ['admin']).map(m => m.name)
  assert.deepEqual(order, ['auth', 'admin']) // mail не запрошен → не в сборке
})

test('optional не блокирует сборку при отсутствии', () => {
  const mods = [{ name: 'auth', requires: [], optional: ['mail'] }] // mail отсутствует
  assert.doesNotThrow(() => resolveOrder(mods))
})

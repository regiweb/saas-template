// EZL-FR-004b — unit tests for the pure authorization rules (node --test).
// No DB: these lock in default-deny and no-privilege-escalation invariants.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  SYSTEM_ROLES,
  isKnownPermission,
  effectivePermissions,
  hasPermission,
  canGrant,
} from './permissions.js'

test('registry: keys are unique and well-formed resource:action', () => {
  const keys = PERMISSIONS.map((p) => p.key)
  assert.equal(new Set(keys).size, keys.length, 'duplicate permission keys')
  for (const k of keys) assert.match(k, /^[a-z]+:[a-z]+$/, `malformed key: ${k}`)
})

test('system roles reference only known permissions', () => {
  for (const [name, def] of Object.entries(SYSTEM_ROLES)) {
    for (const key of def.permissions) {
      assert.ok(isKnownPermission(key), `role ${name} references unknown permission ${key}`)
    }
  }
})

test('admin system role holds the full registry', () => {
  assert.equal(SYSTEM_ROLES.admin.permissions.length, PERMISSION_KEYS.size)
  for (const k of PERMISSION_KEYS) {
    assert.ok(SYSTEM_ROLES.admin.permissions.includes(k), `admin missing ${k}`)
  }
})

test('user system role is minimal (own profile only)', () => {
  assert.deepEqual(SYSTEM_ROLES.user.permissions.sort(), ['profile:read', 'profile:write'])
})

test('effectivePermissions unions roles and dedupes', () => {
  const set = effectivePermissions([
    { permissions: ['users:read', 'users:write'] },
    { permissions: ['users:read', 'settings:read'] },
  ])
  assert.deepEqual([...set].sort(), ['settings:read', 'users:read', 'users:write'])
})

test('default-deny: empty/unknown effective set denies', () => {
  assert.equal(hasPermission(new Set(), 'users:read'), false)
  assert.equal(hasPermission(undefined, 'users:read'), false)
  assert.equal(hasPermission(new Set(['users:read']), 'users:read'), true)
})

test('no escalation: actor cannot grant a permission they lack', () => {
  const actor = new Set(['users:read', 'roles:manage'])
  assert.equal(canGrant(actor, ['users:read']), true)
  assert.equal(canGrant(actor, ['users:write']), false, 'granted a permission not held')
  assert.equal(canGrant(actor, ['users:read', 'settings:write']), false)
})

test('no escalation: roles:manage alone does not confer other permissions', () => {
  const actor = new Set(['roles:manage'])
  assert.equal(canGrant(actor, ['users:write']), false)
  assert.equal(canGrant(actor, ['roles:manage']), true)
})

test('canGrant rejects unknown permission keys', () => {
  const actor = new Set([...PERMISSION_KEYS])
  assert.equal(canGrant(actor, ['users:read']), true)
  assert.equal(canGrant(actor, ['made:up']), false)
})

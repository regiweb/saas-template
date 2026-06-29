// EZL-FR-004c — handler-level security tests (node --test, no DB).
// A fake db lets us exercise the escalation / system-role / lock-out guards
// without a live Postgres (CI runs node --test without a database).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRole,
  updateRolePermissions,
  deleteRole,
  assignRole,
  unassignRole,
} from './handlers.js'

// db.query(sql, params) -> responder picks rows by matching a substring of sql.
function makeDb(rules = []) {
  const calls = []
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params })
      for (const [needle, rows] of rules) {
        if (sql.includes(needle)) return { rows: typeof rows === 'function' ? rows(params) : rows }
      }
      return { rows: [] }
    },
  }
}

function makeReply() {
  return {
    _code: 200,
    _payload: undefined,
    code(c) { this._code = c; return this },
    send(p) { this._payload = p; return this },
  }
}

function makeReq({ perms = [], body = {}, params = {}, sub = 'actor' } = {}, db) {
  return { permissions: new Set(perms), body, params, user: { sub }, server: { db } }
}

test('createRole: escalation — granting a permission the actor lacks → 403', async () => {
  const db = makeDb()
  const reply = makeReply()
  await createRole(makeReq({ perms: ['users:read'], body: { name: 'editor', permissions: ['users:write'] } }, db), reply)
  assert.equal(reply._code, 403)
  assert.equal(reply._payload.error.code, 'FORBIDDEN')
  // no role row should have been inserted
  assert.equal(db.calls.some((c) => c.sql.includes('INSERT INTO roles')), false)
})

test('createRole: reserved system name → 400', async () => {
  const reply = makeReply()
  await createRole(makeReq({ perms: ['roles:manage'], body: { name: 'admin', permissions: ['roles:manage'] } }, makeDb()), reply)
  assert.equal(reply._code, 400)
})

test('createRole: actor holding the permission → 201 and rows inserted', async () => {
  const db = makeDb()
  const reply = makeReply()
  await createRole(makeReq({ perms: ['users:read', 'users:write'], body: { name: 'editor', permissions: ['users:read', 'users:write'] } }, db), reply)
  assert.equal(reply._code, 201)
  assert.equal(db.calls.some((c) => c.sql.includes('INSERT INTO roles')), true)
  assert.equal(db.calls.filter((c) => c.sql.includes('INSERT INTO role_permissions')).length, 2)
})

test('updateRolePermissions: system role is frozen → 403', async () => {
  const db = makeDb([['FROM roles WHERE id', [{ id: 'role_admin', name: 'admin', is_system: true }]]])
  const reply = makeReply()
  await updateRolePermissions(makeReq({ perms: ['roles:manage'], params: { id: 'role_admin' }, body: { permissions: ['users:read'] } }, db), reply)
  assert.equal(reply._code, 403)
  assert.equal(db.calls.some((c) => c.sql.includes('DELETE FROM role_permissions')), false)
})

test('deleteRole: system role cannot be deleted → 403', async () => {
  const db = makeDb([['FROM roles WHERE id', [{ id: 'role_user', name: 'user', is_system: true }]]])
  const reply = makeReply()
  await deleteRole(makeReq({ perms: ['roles:manage'], params: { id: 'role_user' } }, db), reply)
  assert.equal(reply._code, 403)
  assert.equal(db.calls.some((c) => c.sql.startsWith('DELETE FROM roles')), false)
})

test('assignRole: escalation — assigning a role with a permission actor lacks → 403', async () => {
  const db = makeDb([
    ['FROM roles WHERE id', [{ id: 'role_x', name: 'power' }]],
    ['FROM users WHERE id', [{ id: 'u2' }]],
    ['FROM role_permissions WHERE role_id', [{ key: 'users:write' }]],
  ])
  const reply = makeReply()
  await assignRole(makeReq({ perms: ['users:read'], params: { id: 'u2' }, body: { roleId: 'role_x' } }, db), reply)
  assert.equal(reply._code, 403)
  assert.equal(db.calls.some((c) => c.sql.includes('INSERT INTO user_roles')), false)
})

test('unassignRole: self lock-out — removing own last roles:manage → 403', async () => {
  // remaining perms (excluding the role being removed) do NOT include roles:manage
  const db = makeDb([['user_roles ur', [{ key: 'users:read' }]]])
  const reply = makeReply()
  await unassignRole(makeReq({ params: { id: 'actor', roleId: 'role_admin' }, sub: 'actor' }, db), reply)
  assert.equal(reply._code, 403)
  assert.equal(db.calls.some((c) => c.sql.startsWith('DELETE FROM user_roles')), false)
})

test('unassignRole: self-removal allowed when roles:manage remains via another role', async () => {
  const db = makeDb([['user_roles ur', [{ key: 'roles:manage' }, { key: 'users:read' }]]])
  const reply = makeReply()
  await unassignRole(makeReq({ params: { id: 'actor', roleId: 'role_x' }, sub: 'actor' }, db), reply)
  assert.equal(reply._code, 204)
  assert.equal(db.calls.some((c) => c.sql.startsWith('DELETE FROM user_roles')), true)
})

test('unassignRole: removing a role from another user does not trigger self lock-out', async () => {
  const db = makeDb()
  const reply = makeReply()
  await unassignRole(makeReq({ params: { id: 'someone-else', roleId: 'role_admin' }, sub: 'actor' }, db), reply)
  assert.equal(reply._code, 204)
  // no lock-out lookup performed for a different user
  assert.equal(db.calls.some((c) => c.sql.includes('user_roles ur')), false)
})

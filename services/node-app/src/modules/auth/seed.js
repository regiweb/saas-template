// modules/auth/seed.js — initial admin provisioning (EZL-MODULE-SPEC `seed` hook).
// Runs once per boot, after migrations. Idempotent: no-op when ADMIN_EMAIL /
// ADMIN_PASSWORD are unset or the account already exists, so it is safe on every
// deploy (local, staging auto-deploy, prod). CREATE-ONLY: never overwrites an
// existing account's password and never auto-promotes a pre-existing account to
// admin (EZL-SECAUDIT-v0.3.0-H4 — that would be a privilege-escalation vector).
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const BCRYPT_ROUNDS = 12
const MIN_ADMIN_PASSWORD = 12

export async function seed(app) {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  if (password.length < MIN_ADMIN_PASSWORD) {
    app.log.warn(`[auth] seed: ADMIN_PASSWORD shorter than ${MIN_ADMIN_PASSWORD} chars — skipping admin seed`)
    return
  }

  const { rows } = await app.db.query('SELECT id, role FROM users WHERE email = $1', [email])
  if (rows[0]) {
    // EZL-SECAUDIT-v0.3.0-H4: do NOT silently promote a pre-existing account. If
    // someone registered ADMIN_EMAIL before the seed ran, auto-promoting it on boot
    // hands them admin. Promotion must be a deliberate action by an existing admin.
    if (rows[0].role !== 'admin') {
      app.log.warn(
        { email },
        '[auth] seed: an account with ADMIN_EMAIL already exists and is NOT admin — refusing to auto-promote (promote manually if this is intended)',
      )
    }
    return
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  await app.db.query(
    "INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, 'admin')",
    [`usr_${randomBytes(12).toString('hex')}`, email, hash],
  )
  app.log.info({ email }, '[auth] seed: created initial admin')
}

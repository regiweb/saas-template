// modules/auth/seed.js — initial admin provisioning (EZL-MODULE-SPEC `seed` hook).
// Runs once per boot, after migrations. Idempotent: no-op when ADMIN_EMAIL /
// ADMIN_PASSWORD are unset or the account already exists, so it is safe on every
// deploy (local, staging auto-deploy, prod). Never overwrites an existing
// account's password — only promotes role to admin if needed.
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const BCRYPT_ROUNDS = 12

export async function seed(app) {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  if (password.length < 8) {
    app.log.warn('[auth] seed: ADMIN_PASSWORD shorter than 8 chars — skipping admin seed')
    return
  }

  const { rows } = await app.db.query('SELECT id, role FROM users WHERE email = $1', [email])
  if (rows[0]) {
    if (rows[0].role !== 'admin') {
      await app.db.query("UPDATE users SET role = 'admin' WHERE id = $1", [rows[0].id])
      app.log.info({ email }, '[auth] seed: promoted existing user to admin')
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

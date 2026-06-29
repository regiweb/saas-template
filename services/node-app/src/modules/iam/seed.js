// EZL-FR-004b — IAM seed: mirror the permission registry into the DB and ensure
// the system roles (admin = full registry, user = minimal) exist with their
// grants. Idempotent (ON CONFLICT DO NOTHING), so it runs safely on every boot
// and picks up newly-added permissions for the admin role automatically.
import { PERMISSIONS, SYSTEM_ROLES } from './permissions.js'

export async function seed(app) {
  const db = app.db

  for (const p of PERMISSIONS) {
    await db.query(
      'INSERT INTO permissions (key, description) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [p.key, p.description],
    )
  }

  for (const [name, def] of Object.entries(SYSTEM_ROLES)) {
    const id = `role_${name}`
    await db.query(
      'INSERT INTO roles (id, name, is_system) VALUES ($1, $2, TRUE) ON CONFLICT (id) DO NOTHING',
      [id, name],
    )
    for (const key of def.permissions) {
      await db.query(
        'INSERT INTO role_permissions (role_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, key],
      )
    }
  }

  // EZL-FR-004d — backward compatibility: map every existing user to the system
  // role matching their legacy users.role ('admin' → role_admin, 'user' → role_user).
  // Only users with NO role assignment yet are mapped, so an explicit role change
  // made later via the admin API is never clobbered on the next boot. Idempotent.
  await db.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT u.id, 'role_' || u.role
       FROM users u
      WHERE u.role IN ('admin', 'user')
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
     ON CONFLICT DO NOTHING`,
  )

  app.log.info('[iam] seed: permissions, system roles + legacy user→role mapping ensured')
}

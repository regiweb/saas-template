/**
 * Global navigation configuration (EZL-US-012).
 *
 * To add a new section, append one entry here — it appears automatically
 * in both the desktop sidebar and the mobile drawer for the right roles.
 *
 * roles: null      → visible to all authenticated users
 * roles: ['admin'] → visible only to users whose role is in the array
 */
export const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard', path: '/welcome',         end: true,  roles: null },
  { icon: '📊', label: 'Admin',     path: '/admin',           end: true,  roles: ['admin'] },
  { icon: '👥', label: 'Users',     path: '/admin/users',     end: false, roles: ['admin'] },
  { icon: '⚙️',  label: 'Settings', path: '/admin/settings',  end: false, roles: ['admin'] },
]

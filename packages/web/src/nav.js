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
  { icon: 'ti ti-home',             label: 'Dashboard',     path: '/welcome',        end: true,  roles: null },
  { icon: 'ti ti-bell',             label: 'Notifications', path: '/notifications',  end: true,  roles: null },
  { icon: 'ti ti-layout-dashboard', label: 'Admin',         path: '/admin',          end: true,  roles: ['admin'] },
  { icon: 'ti ti-users',            label: 'Users',         path: '/admin/users',    end: false, roles: ['admin'] },
  { icon: 'ti ti-device-desktop',   label: 'Sessions',      path: '/admin/sessions', end: false, roles: ['admin'] },
  { icon: 'ti ti-chart-line',       label: 'Business',      path: '/admin/business', end: false, roles: ['admin'] },
  { icon: 'ti ti-activity-heartbeat', label: 'Infrastructure', path: '/admin/metrics', end: false, roles: ['admin'] },
  { icon: 'ti ti-speakerphone',     label: 'Broadcast',     path: '/admin/broadcast', end: false, roles: ['admin'] },
  { icon: 'ti ti-settings',         label: 'Settings',      path: '/admin/settings', end: false, roles: ['admin'] },
]

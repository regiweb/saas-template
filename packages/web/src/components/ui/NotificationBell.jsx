import { useNavigate } from 'react-router-dom'
import { useNotificationCount } from '../../hooks/useNotificationCount.jsx'
import { useT } from '../../i18n/index.jsx'

// Navbar bell: reads the shared unread count (kept in sync with the inbox) and
// routes to /notifications on click. Click-popup is tracked as FR #144.
export function NotificationBell() {
  const navigate = useNavigate()
  const { unreadCount } = useNotificationCount()
  const t = useT()

  return (
    <button
      className="nav-icon-btn nav-bell"
      aria-label={unreadCount > 0 ? t('{n} unread', { n: unreadCount }) : t('Notifications')}
      onClick={() => navigate('/notifications')}
    >
      <i className="ti ti-bell" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="nav-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  )
}

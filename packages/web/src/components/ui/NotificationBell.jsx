import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as api from '../../api/notifications.js'
import { useT } from '../../i18n/index.jsx'

// Navbar bell: shows the unread count and routes to the inbox on click.
// (Min viable per smoke feedback — a click-popup is tracked as a separate FR.)
export function NotificationBell() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const t = useT()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let alive = true
    const load = () =>
      api.getUnreadCount(accessToken)
        .then((r) => { if (alive) setCount(r.count ?? 0) })
        .catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [accessToken])

  return (
    <button
      className="nav-icon-btn nav-bell"
      aria-label={count > 0 ? t('{n} unread', { n: count }) : t('Notifications')}
      onClick={() => navigate('/notifications')}
    >
      <i className="ti ti-bell" aria-hidden="true" />
      {count > 0 && <span className="nav-bell-badge">{count > 99 ? '99+' : count}</span>}
    </button>
  )
}

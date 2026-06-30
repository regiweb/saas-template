import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import * as api from '../api/notifications.js'

// Single source of truth for the unread badge so the navbar bell and the
// Notifications page stay in sync — marking read on the page updates the bell
// immediately (no waiting for the next poll).
const Ctx = createContext(null)

export function NotificationsProvider({ children }) {
  const { accessToken } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnread = useCallback(() => {
    if (!accessToken) { setUnreadCount(0); return }
    api.getUnreadCount(accessToken)
      .then((r) => setUnreadCount(r.count ?? 0))
      .catch(() => {})
  }, [accessToken])

  // Initial load + background poll for newly-arrived notifications.
  useEffect(() => {
    refreshUnread()
    const id = setInterval(refreshUnread, 30000)
    return () => clearInterval(id)
  }, [refreshUnread])

  return (
    <Ctx.Provider value={{ unreadCount, setUnreadCount, refreshUnread }}>
      {children}
    </Ctx.Provider>
  )
}

export function useNotificationCount() {
  return useContext(Ctx) ?? { unreadCount: 0, setUnreadCount: () => {}, refreshUnread: () => {} }
}

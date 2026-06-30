import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { useNotificationCount } from './useNotificationCount.jsx'
import * as api from '../api/notifications.js'

export default function useNotifications() {
  const { accessToken } = useAuth()
  const { unreadCount, setUnreadCount } = useNotificationCount()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getNotifications(accessToken, { limit: 50 })
      setItems(res.items)
      setUnreadCount(res.unreadCount)
    } catch {
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, setUnreadCount])

  useEffect(() => { load() }, [load])

  async function markRead(id) {
    const target = items.find((n) => n.id === id)
    if (!target || target.read) return
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await api.markRead(accessToken, id)
    } catch {
      load() // re-sync on failure
    }
  }

  async function markAllRead() {
    if (unreadCount === 0) return
    const prev = items
    setItems((list) => list.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await api.markAllRead(accessToken)
    } catch {
      setItems(prev)
      load()
    }
  }

  return { items, unreadCount, loading, error, markRead, markAllRead, reload: load }
}

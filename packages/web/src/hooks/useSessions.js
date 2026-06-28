import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
// TODO: switch to '../api/admin.js' when sessions backend ships
import * as api from '../api/adminMock.js'

export default function useSessions() {
  const { accessToken } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getSessions(accessToken)
      setSessions(res)
    } catch {
      setError('Failed to load sessions.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/exhaustive-deps

  async function revokeSession(id) {
    const prev = sessions
    setSessions(s => s.filter(x => x.id !== id))
    try {
      await api.revokeSession(accessToken, id)
    } catch {
      setSessions(prev)
      throw new Error('Failed to revoke session.')
    }
  }

  async function revokeAllForUser(userId) {
    const prev = sessions
    setSessions(s => s.filter(x => x.userId !== userId || x.current))
    try {
      await api.revokeAllSessions(accessToken, userId)
    } catch {
      setSessions(prev)
      throw new Error('Failed to revoke sessions.')
    }
  }

  async function revokeBulkSessions(ids) {
    const idSet = new Set(ids)
    const prev  = sessions
    setSessions(s => s.filter(x => !idSet.has(x.id)))
    try {
      await api.revokeBulkSessions(accessToken, ids)
    } catch {
      setSessions(prev)
      throw new Error('Failed to revoke sessions.')
    }
  }

  return {
    sessions,
    loading,
    error,
    revokeSession,
    revokeAllForUser,
    revokeBulkSessions,
    reload: load,
  }
}

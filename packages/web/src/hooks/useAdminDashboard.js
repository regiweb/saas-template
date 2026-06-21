import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import * as api from '../api/admin.js'

export default function useAdminDashboard() {
  const { accessToken } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getDashboard(accessToken)
      setData(result)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}

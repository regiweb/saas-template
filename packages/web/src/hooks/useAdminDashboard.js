import { useState, useEffect, useCallback } from 'react'
import * as api from '../api/adminMock.js'

export default function useAdminDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getDashboard()
      setData(result)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}

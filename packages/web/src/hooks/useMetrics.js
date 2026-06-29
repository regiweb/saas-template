import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth.jsx'
import * as api from '../api/admin.js'

const REFRESH_MS = 5000

// Live infrastructure snapshot with optional auto-refresh polling.
export default function useMetrics() {
  const { accessToken } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [auto, setAuto]       = useState(true)
  const timer = useRef(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const result = await api.getMetrics(accessToken)
      setData(result)
      setError(null)
    } catch {
      setError('Failed to load metrics.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!auto) return
    timer.current = setInterval(() => load({ silent: true }), REFRESH_MS)
    return () => clearInterval(timer.current)
  }, [auto, load])

  return { data, loading, error, auto, setAuto, retry: () => load() }
}

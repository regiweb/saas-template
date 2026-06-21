import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import * as api from '../api/admin.js'

export default function useAdminSettings() {
  const { accessToken } = useAuth()
  const [original, setOriginal] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedMsg, setSavedMsg] = useState(null)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSettings(accessToken)
      setOriginal(data)
      setSettings(data)
    } catch {
      setError('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { load() }, [load])

  function updateField(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  function discard() {
    setSettings({ ...original })
  }

  const dirty = settings && original
    ? Object.keys(original).some(k => settings[k] !== original[k])
    : false

  async function save() {
    setSaving(true)
    setSavedMsg(null)
    try {
      const saved = await api.saveSettings(accessToken, settings)
      setOriginal(saved)
      setSettings(saved)
      setSavedMsg('Settings saved successfully')
      setTimeout(() => setSavedMsg(null), 3000)
    } catch {
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return { settings, original, loading, saving, savedMsg, error, dirty, updateField, discard, save }
}

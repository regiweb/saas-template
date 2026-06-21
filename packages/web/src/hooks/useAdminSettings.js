import { useState, useEffect, useCallback } from 'react'
import * as api from '../api/adminMock.js'

export default function useAdminSettings() {
  const [original, setOriginal] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedMsg, setSavedMsg] = useState(null)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSettings()
      setOriginal(data)
      setSettings(data)
    } catch {
      setError('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

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
      const saved = await api.saveSettings(settings)
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

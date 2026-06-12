import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as realApi from '../api/auth.js'
import * as mockApi from '../api/mock.js'

const api = import.meta.env.VITE_USE_MOCK === 'true' ? mockApi : realApi

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  // Start loading only when a stored token exists — allows ProtectedRoute to
  // redirect immediately on first render when there is no session to restore.
  const [loading, setLoading] = useState(() => !!localStorage.getItem('refreshToken'))

  function storeTokens({ accessToken: at, refreshToken: rt, user: u }) {
    setAccessToken(at)
    localStorage.setItem('refreshToken', rt)
    if (u) setUser(u)
  }

  function clearAuth() {
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem('refreshToken')
  }

  // Restore session on mount via stored refresh token
  useEffect(() => {
    const rt = localStorage.getItem('refreshToken')
    if (!rt) return   // loading is already false — nothing to restore

    api.refresh(rt)
      .then((data) => {
        setAccessToken(data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        return api.me(data.accessToken)
      })
      .then((data) => setUser(data.user))
      .catch(() => clearAuth())
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh 1 minute before the 15-minute access token expires
  useEffect(() => {
    if (!accessToken) return
    const timer = setTimeout(() => {
      const rt = localStorage.getItem('refreshToken')
      if (!rt) return
      api.refresh(rt)
        .then((data) => storeTokens(data))
        .catch(() => clearAuth())
    }, 14 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [accessToken])

  const signIn = useCallback(async (email, password) => {
    const data = await api.login(email, password)
    storeTokens(data)
    return data
  }, [])

  const signUp = useCallback(async (email, password) => {
    const data = await api.register(email, password)
    storeTokens(data)
    return data
  }, [])

  const signOut = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken')
    if (accessToken && rt) {
      await api.logout(accessToken, rt).catch(() => {})
    }
    clearAuth()
  }, [accessToken])

  const value = { user, accessToken, loading, signIn, signUp, signOut, api }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

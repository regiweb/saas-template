import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { api } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!token) {
      setError('Reset token is missing. Please use the link from your email.')
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const code = err?.error?.code
      if (code === 'INVALID_TOKEN') {
        setError('This reset link has expired or already been used. Please request a new one.')
      } else {
        setError(err?.error?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">New password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account</p>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Password updated!</p>
              <p className="text-sm text-gray-500 mt-1">Redirecting you to sign in…</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
          >
            {!token && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
                No reset token found. Please use the link from your email.
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !token}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="Min 8 characters"
              />
              {password.length > 0 && password.length < 8 && (
                <p className="mt-1 text-xs text-amber-600">
                  {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !token}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {!success && (
          <p className="text-center mt-4 text-sm text-gray-500">
            <Link to="/forgot-password" className="text-indigo-600 font-medium hover:underline">
              Request a new reset link
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

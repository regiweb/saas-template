import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { api } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.error?.message || 'Something went wrong. Please try again.')
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
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Check your inbox</p>
              <p className="text-sm text-gray-500 mt-1">
                If <span className="font-medium">{email}</span> is registered, a reset link has been sent.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-sm text-indigo-600 font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
          >
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {!sent && (
          <p className="text-center mt-4 text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

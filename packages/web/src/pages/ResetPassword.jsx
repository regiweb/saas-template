import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { FormField } from '../components/ui/FormField.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Banner } from '../components/ui/Banner.jsx'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { api } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
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

  if (success) {
    return (
      <AuthPage>
        <AuthNavbar />
        <AuthBody>
          <div className="auth-icon-wrap auth-icon-green" style={{ marginBottom: 16 }}>
            ✓
          </div>
          <h1 className="auth-title">Password updated!</h1>
          <p className="auth-sub">Redirecting you to sign in…</p>
        </AuthBody>
      </AuthPage>
    )
  }

  const pwdShort = password.length > 0 && password.length < 8
  const remaining = 8 - password.length

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        <div className="auth-icon-wrap auth-icon-teal" style={{ marginBottom: 16 }}>
          🔒
        </div>
        <h1 className="auth-title">New password</h1>
        <p className="auth-sub">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit}>
          {!token && (
            <Banner type="warn">
              No reset token found. Please use the link from your email.
            </Banner>
          )}
          {error && <Banner type="err">⚠ {error}</Banner>}

          <FormField
            label="New password"
            hint={pwdShort ? `${remaining} more character${remaining !== 1 ? 's' : ''} needed` : undefined}
          >
            <input
              className="fi"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading || !token}
              placeholder="Min 8 characters"
            />
          </FormField>

          <Button variant="p" loading={loading} disabled={!password || !token} type="submit">
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>

        <p className="auth-footer">
          <Link to="/forgot-password" className="link-teal">Request a new reset link</Link>
        </p>
      </AuthBody>
    </AuthPage>
  )
}

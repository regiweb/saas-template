import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { FormField } from '../components/ui/FormField.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Banner } from '../components/ui/Banner.jsx'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const { api } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const code = err?.error?.code
      setError(
        code === 'INVALID_TOKEN'
          ? 'This reset link has expired or already been used. Please request a new one.'
          : (err?.error?.message || 'Something went wrong. Please try again.')
      )
    } finally {
      setLoading(false)
    }
  }

  const pwdShort  = password.length > 0 && password.length < 8
  const remaining = 8 - password.length
  const mismatch  = confirm.length > 0 && password !== confirm

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        {!token ? (
          <div>
            <div className="auth-icon-wrap auth-icon-err">⚠</div>
            <h1 className="auth-title">Invalid link</h1>
            <p className="auth-sub">
              No reset token found. Please use the link from your email or request a new one.
            </p>
            <Link to="/forgot-password">
              <Button variant="p" type="button">Request new link</Button>
            </Link>
          </div>
        ) : success ? (
          <div>
            <div className="auth-icon-wrap auth-icon-green">✓</div>
            <h1 className="auth-title">Password updated!</h1>
            <p className="auth-sub">Redirecting you to sign in…</p>
          </div>
        ) : (
          <div>
            <div className="auth-icon-wrap auth-icon-teal">🔒</div>
            <h1 className="auth-title">New password</h1>
            <p className="auth-sub">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit}>
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
                  disabled={loading}
                  placeholder="Min 8 characters"
                />
              </FormField>

              <FormField
                label="Confirm password"
                error={mismatch ? 'Passwords do not match' : undefined}
              >
                <input
                  className={`fi${mismatch ? ' err' : ''}`}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  disabled={loading}
                  placeholder="Repeat password"
                />
              </FormField>

              <Button
                variant="p"
                loading={loading}
                disabled={!password || !confirm || mismatch}
                type="submit"
              >
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </form>

            <p className="auth-footer">
              <Link to="/forgot-password" className="link-teal">Request a new reset link</Link>
            </p>
          </div>
        )}
      </AuthBody>
    </AuthPage>
  )
}

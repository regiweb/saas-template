import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { Logo } from '../components/ui/Logo.jsx'
import { FormField } from '../components/ui/FormField.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Banner } from '../components/ui/Banner.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/welcome')
    } catch (err) {
      setError(err?.error?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        <div className="auth-logo-row">
          <Logo size="md" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account to continue</p>

        <form onSubmit={handleSubmit}>
          {error && <Banner type="err">⚠ {error}</Banner>}

          <FormField label="Email">
            <input
              className={`fi${error ? ' err' : ''}`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@example.com"
            />
          </FormField>

          <FormField
            label="Password"
            rightLabel={
              <Link to="/forgot-password" className="link-teal">Forgot password?</Link>
            }
          >
            <input
              className={`fi${error ? ' err' : ''}`}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
            />
          </FormField>

          <div style={{ marginTop: 18 }}>
            <Button variant="p" loading={loading} disabled={!email || !password} type="submit">
              {loading ? 'Signing in…' : 'Sign in →'}
            </Button>
          </div>

          <div className="div-or">or</div>

          <Button variant="s" type="button" disabled={loading}>
            Continue with GitHub
          </Button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="link-teal">Sign up for free</Link>
        </p>
      </AuthBody>
    </AuthPage>
  )
}

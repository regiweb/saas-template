import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { Logo } from '../components/ui/Logo.jsx'
import { FormField } from '../components/ui/FormField.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Banner } from '../components/ui/Banner.jsx'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      navigate('/welcome')
    } catch (err) {
      const code = err?.error?.code
      if (code === 'USER_EXISTS') {
        setError('An account with that email already exists.')
      } else {
        setError(err?.error?.message || 'Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  const pwdShort = password.length > 0 && password.length < 8
  const remaining = 8 - password.length

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        <div className="auth-logo-row">
          <Logo size="md" />
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">
          Start with EZ Launch today.{' '}
          <Link to="/login" className="link-teal">Already have one?</Link>
        </p>

        <form onSubmit={handleSubmit}>
          {error && <Banner type="err">⚠ {error}</Banner>}

          <FormField label="Email">
            <input
              className="fi"
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

          <Button variant="p" loading={loading} disabled={!email || !password} type="submit">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="auth-footer">
          By signing up, you agree to our{' '}
          <a href="#" className="link-teal">Terms</a>
          {' '}and{' '}
          <a href="#" className="link-teal">Privacy Policy</a>
        </p>
      </AuthBody>
    </AuthPage>
  )
}

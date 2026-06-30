import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useT } from '../i18n/index.jsx'
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
  const [pendingNav, setPendingNav] = useState(null)
  const { signIn, user } = useAuth()
  const t = useT()
  const navigate = useNavigate()

  // Navigate only after user state is committed to avoid race condition
  useEffect(() => {
    if (user && pendingNav) {
      navigate(pendingNav, { replace: true })
    }
  }, [user, pendingNav, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await signIn(email, password)
      setPendingNav(data?.user?.role === 'admin' ? '/admin' : '/welcome')
    } catch (err) {
      setError(err?.error?.message ? t(err.error.message) : t('Something went wrong. Please try again.'))
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
        <h1 className="auth-title">{t('Welcome back')}</h1>
        <p className="auth-sub">{t('Sign in to your account to continue')}</p>

        <form onSubmit={handleSubmit}>
          {error && <Banner type="err">⚠ {error}</Banner>}

          <FormField label={t('Email')}>
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
            label={t('Password')}
            rightLabel={
              <Link to="/forgot-password" className="link-teal">{t('Forgot password?')}</Link>
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
              {loading ? t('Signing in…') : t('Sign in →')}
            </Button>
          </div>

          <div className="div-or">{t('or')}</div>

          <Button variant="s" type="button" disabled={loading}>
            {t('Continue with GitHub')}
          </Button>
        </form>

        <p className="auth-footer">
          {t("Don't have an account?")}{' '}
          <Link to="/register" className="link-teal">{t('Sign up for free')}</Link>
        </p>
      </AuthBody>
    </AuthPage>
  )
}

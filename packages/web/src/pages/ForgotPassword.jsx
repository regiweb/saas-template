import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useT } from '../i18n/index.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { FormField } from '../components/ui/FormField.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Banner } from '../components/ui/Banner.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { api } = useAuth()
  const t = useT()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.error?.message || t('Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        {sent ? (
          <div>
            <div className="auth-icon-wrap auth-icon-green" style={{ marginBottom: 16 }}>✉</div>
            <h1 className="auth-title">{t('Check your inbox')}</h1>
            <p className="auth-sub">
              {t('If')} <strong style={{ color: 'var(--txt)' }}>{email}</strong>{' '}
              {t('is registered, a reset link has been sent.')}
            </p>
            <Link to="/login">
              <Button variant="p" type="button">{t('Back to sign in')}</Button>
            </Link>
            <p className="auth-footer">
              {t("Didn't receive it?")}{' '}
              <button
                onClick={() => setSent(false)}
                className="link-teal"
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
              >
                {t('Try again')}
              </button>
            </p>
          </div>
        ) : (
          <div>
            <div className="auth-icon-wrap auth-icon-teal" style={{ marginBottom: 16 }}>🔑</div>
            <h1 className="auth-title">{t('Reset password')}</h1>
            <p className="auth-sub">{t("Enter your email and we'll send a reset link.")}</p>

            <form onSubmit={handleSubmit}>
              {error && <Banner type="err">⚠ {error}</Banner>}

              <FormField label={t('Email')}>
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

              <Button variant="p" loading={loading} disabled={!email} type="submit">
                {loading ? t('Sending…') : t('Send reset link')}
              </Button>
            </form>

            <p className="auth-footer">
              <Link to="/login" className="link-teal">{t('Back to sign in')}</Link>
            </p>
          </div>
        )}
      </AuthBody>
    </AuthPage>
  )
}

import { useAuth } from '../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'
import { Button } from '../components/ui/Button.jsx'

export default function Welcome() {
  const { user } = useAuth()
  const t = useT()
  const navigate = useNavigate()

  if (!user) return null

  const initials = user.email[0].toUpperCase()

  return (
    <div className="welcome-body">
      <div className="welcome-card">
        <div className="auth-body">

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="welcome-avatar" style={{ marginBottom: 12 }}>
              {initials}
            </div>
            <h2 className="auth-title" style={{ marginBottom: 4 }}>{t('Welcome!')}</h2>
            <p style={{ fontSize: 12, color: 'var(--txt2)', wordBreak: 'break-all' }}>
              {user?.email}
            </p>
            {user?.role && (
              <div style={{ marginTop: 8 }}>
                <span className="role-badge">{user.role}</span>
              </div>
            )}
          </div>

          <div className="info-block">
            <div className="info-block-label">{t('Account')}</div>
            <div className="info-item">
              <span className="info-item-key">{t('ID')}</span>
              <span className="info-item-val">{user?.id}</span>
            </div>
            {user?.createdAt && (
              <div className="info-item">
                <span className="info-item-key">{t('Joined')}</span>
                <span className="info-item-val">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <Button variant="s" type="button" onClick={() => navigate('/forgot-password')}>
              {t('🔑 Change Password')}
            </Button>
            {user?.role === 'admin' && (
              <Button variant="p" type="button" onClick={() => navigate('/admin')}>
                {t('⚙ Admin Dashboard')}
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

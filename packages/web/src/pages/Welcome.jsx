import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { Button } from '../components/ui/Button.jsx'

// Skeleton shown defensively if user is null post-ProtectedRoute (should not happen in practice)
function DashboardSkeleton() {
  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skel" style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto' }} />
          <div className="skel" style={{ height: 18, width: '70%', margin: '0 auto', borderRadius: 4 }} />
          <div className="skel" style={{ height: 14, width: '35%', margin: '0 auto', borderRadius: 999 }} />
          <div className="skel" style={{ height: 88, width: '100%', borderRadius: 12 }} />
          <div className="skel" style={{ height: 1, width: '100%' }} />
          <div className="skel" style={{ height: 40, width: '100%', borderRadius: 8 }} />
          <div className="skel" style={{ height: 40, width: '100%', borderRadius: 8 }} />
        </div>
      </AuthBody>
    </AuthPage>
  )
}

export default function Welcome() {
  const { user, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    navigate('/login')
  }

  if (!user) return <DashboardSkeleton />

  const initials = user.email[0].toUpperCase()

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>

        {/* ── Greeting + avatar + role ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="welcome-avatar" style={{ marginBottom: 14 }}>
            {initials}
          </div>
          <h2
            className="auth-title"
            style={{ marginBottom: 8, wordBreak: 'break-all', fontSize: 15 }}
          >
            Привет, {user.email}!
          </h2>
          <span className="role-badge">{user.role}</span>
        </div>

        {/* ── Account card ── */}
        <div className="info-block" style={{ marginBottom: 16 }}>
          <div className="info-block-label">Аккаунт</div>
          <div className="info-item">
            <span className="info-item-key">Email</span>
            <span className="info-item-val">{user.email}</span>
          </div>
          <div className="info-item">
            <span className="info-item-key">Роль</span>
            <span className="info-item-val">{user.role}</span>
          </div>
          {user.createdAt && (
            <div className="info-item">
              <span className="info-item-key">Дата регистрации</span>
              <span className="info-item-val">
                {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          )}
        </div>

        {/* ── Admin shortcut (admin only) ── */}
        {user.role === 'admin' && (
          <Link to="/admin" style={{ display: 'block', marginBottom: 16, textDecoration: 'none' }}>
            <div
              className="info-block"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                border: '1px solid rgba(13,148,136,0.3)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(13,148,136,0.06)'
                e.currentTarget.style.borderColor = 'rgba(13,148,136,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ''
                e.currentTarget.style.borderColor = 'rgba(13,148,136,0.3)'
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', marginBottom: 2 }}>
                  Панель администратора
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Управление пользователями и настройками
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 16 }}>›</span>
            </div>
          </Link>
        )}

        <div className="divider-line" />

        {/* ── Quick actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button variant="s" onClick={() => navigate('/forgot-password')}>
            Сменить пароль
          </Button>
          <Button variant="s" loading={loggingOut} onClick={handleLogout}>
            {loggingOut ? 'Выход…' : 'Выйти'}
          </Button>
        </div>

      </AuthBody>
    </AuthPage>
  )
}

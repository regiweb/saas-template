import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { AuthPage, AuthNavbar, AuthBody } from '../components/ui/AuthLayout.jsx'
import { Button } from '../components/ui/Button.jsx'

export default function Welcome() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    setLoading(true)
    await signOut()
    navigate('/login')
  }

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <AuthPage>
      <AuthNavbar />
      <AuthBody>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="welcome-avatar" style={{ marginBottom: 12 }}>{initials}</div>
          <h2 className="auth-title" style={{ marginBottom: 4 }}>Welcome!</h2>
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
          <div className="info-block-label">Account</div>
          <div className="info-item">
            <span className="info-item-key">ID</span>
            <span className="info-item-val">{user?.id}</span>
          </div>
          {user?.createdAt && (
            <div className="info-item">
              <span className="info-item-key">Joined</span>
              <span className="info-item-val">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="divider-line" />

        <Button variant="s" loading={loading} onClick={handleLogout}>
          {loading ? 'Signing out…' : 'Sign out'}
        </Button>
      </AuthBody>
    </AuthPage>
  )
}

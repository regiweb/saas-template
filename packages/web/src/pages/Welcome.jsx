/**
 * Welcome — dashboard page for any authenticated user (EZL-US-012).
 * Rendered inside AppLayout; does not need its own nav shell.
 */
import { useAuth } from '../hooks/useAuth.jsx'

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
  const { user } = useAuth()

  if (!user) return <DashboardSkeleton />

  const initials = user.email[0].toUpperCase()

  return (
    <div className="welcome-body">
      <div className="welcome-card">
        <div className="auth-body">

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className="welcome-avatar" style={{ marginBottom: 12 }}>
              {initials}
            </div>
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

        </div>
      </div>
    </div>
  )
}

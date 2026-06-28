import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import ActivityFeed from '../../components/admin/ActivityFeed.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Toast from '../../components/admin/Toast.jsx'
import * as api from '../../api/admin.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { PREDEFINED_ROLES, ROLE_LABELS } from '../../constants/roles.js'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

function initials(email) {
  const parts = email.split('@')[0].split(/[._-]/)
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? '')).toUpperCase()
}

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)      return 'Just now'
  if (diff < 3600000)    return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000)   return `${Math.floor(diff / 3600000)} hr ago`
  return fmtDate(iso)
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser, accessToken } = useAuth()

  const [user, setUser]         = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [confirm, setConfirm]           = useState(null)
  const [actionLoading, setActLoading]  = useState(false)
  const [toast, setToast]               = useState(null)

  // Role selector state
  const [pendingRole, setPendingRole]   = useState(null)
  const [roleSaving, setRoleSaving]     = useState(false)

  // Guard: admin cannot demote their own account
  const isSelf = !!authUser && authUser.id === id

  function showToast(message, variant = 'ok') { setToast({ message, variant }) }

  useEffect(() => {
    if (!accessToken) return
    api.getUserById(accessToken, id)
      .then(({ user: u, activity: a }) => {
        setUser(u)
        setActivity(a)
        setPendingRole(u.role)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, accessToken])

  /**
   * Apply role change: optimistic update → API → rollback on error.
   * Does NOT manage loading/confirm state — caller is responsible.
   */
  async function applyRoleChange(targetRole) {
    const prevRole = user.role
    // Optimistic
    setUser(u => ({ ...u, role: targetRole }))
    setPendingRole(targetRole)
    try {
      await api.changeRole(accessToken, user.id, targetRole)
      showToast(`Role changed to ${ROLE_LABELS[targetRole]}`)
    } catch {
      // Rollback
      setUser(u => ({ ...u, role: prevRole }))
      setPendingRole(prevRole)
      showToast('Failed to change role — please try again', 'err')
    }
  }

  /**
   * Triggered by the "Save" button in the role selector.
   * Promotion to admin requires confirmation modal.
   * Demotion to user is applied directly.
   */
  async function handleSaveRole() {
    if (!pendingRole || pendingRole === user.role || isSelf) return
    if (pendingRole === 'admin') {
      // Promotion: open confirm modal first
      setConfirm({ type: 'role', targetRole: 'admin' })
      return
    }
    // Demotion: no confirmation needed, apply directly
    setRoleSaving(true)
    try {
      await applyRoleChange(pendingRole)
    } finally {
      setRoleSaving(false)
    }
  }

  async function handleConfirm() {
    if (!confirm || !user) return
    setActLoading(true)
    try {
      if (confirm.type === 'block') {
        await api.blockUser(accessToken, user.id)
        setUser(u => ({ ...u, status: 'blocked', blockedAt: new Date().toISOString() }))
        showToast('User blocked')
      } else if (confirm.type === 'unblock') {
        await api.unblockUser(accessToken, user.id)
        setUser(u => { const n = { ...u, status: 'active' }; delete n.blockedAt; return n })
        showToast('User unblocked')
      } else if (confirm.type === 'delete') {
        await api.deleteUser(accessToken, user.id)
        navigate('/admin/users', { replace: true })
        return
      } else if (confirm.type === 'role') {
        // Promotion confirmed — applyRoleChange handles optimistic + rollback
        await applyRoleChange(confirm.targetRole)
      }
    } finally {
      setActLoading(false)
      setConfirm(null)
    }
  }

  async function handleReset() {
    try {
      const res = await api.resetPassword(accessToken, user.id)
      showToast(`Reset email sent to ${res?.email ?? user.email}`)
    } catch {
      showToast('Failed to send reset email — please try again', 'err')
    }
  }

  const blocked = user?.status === 'blocked'

  return (
    <AdminShell>
      {loading ? (
        <div className="ud-header-wrap">
          <div className="skel" style={{ height: 11, width: 100, marginBottom: 14 }} />
          <div className="user-header">
            <div className="user-id">
              <div className="skel" style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skel" style={{ height: 14, width: 180 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div className="skel" style={{ height: 18, width: 50, borderRadius: 'var(--rpill)' }} />
                  <div className="skel" style={{ height: 18, width: 60, borderRadius: 'var(--rpill)' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="skel" style={{ height: 32, width: 120, borderRadius: 'var(--r8)' }} />
              <div className="skel" style={{ height: 32, width: 80, borderRadius: 'var(--r8)' }} />
              <div className="skel" style={{ height: 32, width: 80, borderRadius: 'var(--r8)' }} />
            </div>
          </div>
        </div>
      ) : notFound ? (
        <div className="ud-header-wrap">
          <a className="back-link" onClick={() => navigate('/admin/users')}>← Back to Users</a>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>👤</div>
            <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--txt2)' }}>User not found</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>This account may have been deleted or the link is invalid.</div>
            <a className="back-link" style={{ marginTop: 8, fontSize: 12, color: 'var(--teal)' }} onClick={() => navigate('/admin/users')}>← Back to Users list</a>
          </div>
        </div>
      ) : user && (
        <>
          <div className="ud-header-wrap">
            <a className="back-link" onClick={() => navigate('/admin/users')}>← Back to Users</a>
            <div className="user-header">
              <div className="user-id">
                <div
                  className={`avatar-lg av-${user.role}`}
                  style={blocked ? { opacity: 0.5 } : {}}
                >
                  {initials(user.email)}
                </div>
                <div>
                  <div className="ud-email" style={blocked ? { color: 'var(--txt2)' } : {}}>
                    {user.email}
                  </div>
                  <div className="user-badges">
                    {/* Role badge in header — display-only; selector lives in the Profile card */}
                    <span className={`badge badge-${user.role}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                    {isSelf && (
                      <span
                        style={{ fontSize: 10, color: 'var(--muted)', cursor: 'help', userSelect: 'none' }}
                        title="You cannot change your own role"
                      >
                        🔒
                      </span>
                    )}
                    <span className={`badge badge-${user.status}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="action-bar">
                <button
                  className="abtn sec"
                  onClick={handleReset}
                >🔑 Reset Password</button>
                {!isSelf && (blocked
                  ? <button className="abtn ok" onClick={() => setConfirm({ type: 'unblock' })}>🔓 Unblock</button>
                  : <button className="abtn warn" onClick={() => setConfirm({ type: 'block' })}>🔒 Block</button>
                )}
                {!isSelf && (
                  <button className="abtn err" onClick={() => setConfirm({ type: 'delete' })}>🗑 Delete</button>
                )}
              </div>
            </div>
          </div>

          <div className="detail-body">
            <div className="col-main">
              <div className="card">
                <div className="card-header"><span className="card-title">Profile</span></div>
                <div className="card-body">
                  <table className="meta-table">
                    <tbody>
                      <tr>
                        <td className="meta-label">Email</td>
                        <td className="meta-value" style={blocked ? { color: 'var(--txt2)' } : {}}>{user.email}</td>
                      </tr>
                      <tr>
                        <td className="meta-label">Role</td>
                        <td className="meta-value">
                          {isSelf ? (
                            /* Guard: cannot demote own account */
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role]}</span>
                              <span
                                style={{ fontSize: 10, color: 'var(--muted)', cursor: 'help' }}
                                title="You cannot change your own role — ask another admin"
                              >
                                🔒 own account
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <select
                                className="sett-select"
                                value={pendingRole ?? user.role}
                                onChange={e => setPendingRole(e.target.value)}
                                disabled={roleSaving}
                                style={{ fontSize: 11, minWidth: 90 }}
                              >
                                {PREDEFINED_ROLES.map(r => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                              {pendingRole !== user.role && !blocked && (
                                <>
                                  <button
                                    className="abtn sec"
                                    disabled={roleSaving}
                                    onClick={handleSaveRole}
                                    style={{ fontSize: 11, padding: '3px 10px' }}
                                  >
                                    {roleSaving
                                      ? <span className="spin" style={{ width: 10, height: 10 }} />
                                      : 'Save'
                                    }
                                  </button>
                                  <span
                                    className="reset-link"
                                    onClick={() => { if (!roleSaving) setPendingRole(user.role) }}
                                    style={{ fontSize: 11, cursor: roleSaving ? 'default' : 'pointer' }}
                                  >
                                    Cancel
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="meta-label">Status</td>
                        <td className="meta-value">
                          <span className={`badge badge-${user.status}`}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                      {user.blockedAt && (
                        <tr>
                          <td className="meta-label">Blocked At</td>
                          <td className="meta-value" style={{ color: 'var(--err)' }}>{fmtDate(user.blockedAt)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="meta-label">Created At</td>
                        <td className="meta-value">{fmtDate(user.createdAt)}</td>
                      </tr>
                      <tr>
                        <td className="meta-label">Last Login</td>
                        <td className="meta-value" style={!blocked ? { color: 'var(--teal)' } : {}}>
                          {relativeTime(user.lastLogin)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Activity</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>last {activity.length} events</span>
                </div>
                {activity.length === 0
                  ? <div className="empty-state"><div className="empty-ico">📭</div><div className="empty-ttl">No activity</div></div>
                  : <ActivityFeed items={activity} />
                }
              </div>
            </div>

            <div className="col-side">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Usage</span>
                  <span className="badge" style={{ background: 'var(--surf)', border: '1px solid var(--brd)', color: 'var(--muted)', fontSize: 9 }}>v0.5.0</span>
                </div>
                <div className="usage-placeholder">
                  <div className="usage-ico">📊</div>
                  <div className="usage-ttl">Not available yet</div>
                  <div className="usage-sub">Usage data will be available in v0.5.0 when billing is enabled.</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirm && user && (
        <ConfirmModal
          title={
            confirm.type === 'block'     ? 'Block user?'
            : confirm.type === 'unblock' ? 'Unblock user?'
            : confirm.type === 'delete'  ? 'Delete account?'
            : `Promote to ${ROLE_LABELS[confirm.targetRole]}?`
          }
          body={
            confirm.type === 'block'
              ? <><strong>{user.email}</strong> will lose access to the platform immediately. All active sessions will be terminated. You can unblock them at any time.</>
              : confirm.type === 'unblock'
              ? <><strong>{user.email}</strong> will regain full access to the platform.</>
              : confirm.type === 'delete'
              ? <><strong>{user.email}</strong> and all associated data will be permanently deleted. This action <strong>cannot be undone</strong>.</>
              : /* role — only 'admin' promotion reaches this confirm */
                <>Promote <strong>{user.email}</strong> to <strong>Admin</strong>? They will gain full administrative access to the platform, including user management.</>
          }
          confirmLabel={
            confirm.type === 'block'     ? '🔒 Block user'
            : confirm.type === 'unblock' ? '🔓 Unblock user'
            : confirm.type === 'delete'  ? '🗑 Delete permanently'
            : '👑 Promote to Admin'
          }
          confirmClass={confirm.type === 'delete' ? 'danger' : 'warn'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  )
}

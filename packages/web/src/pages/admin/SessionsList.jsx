import { useState, useMemo } from 'react'
import AdminShell from '../../components/admin/AdminShell.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Toast from '../../components/admin/Toast.jsx'
import useSessions from '../../hooks/useSessions.js'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return fmtDate(iso)
}

function parseUA(ua) {
  if (!ua) return 'Browser'

  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  let os = ''
  if (/iPhone/.test(ua)) os = 'iOS'
  else if (/iPad/.test(ua)) os = 'iPadOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  return os ? `${browser} · ${os}` : browser
}

export default function SessionsList() {
  const { sessions, loading, error, revokeSession, revokeAllForUser, reload } = useSessions()

  const [confirm, setConfirm]           = useState(null)  // { type: 'one' | 'all', session }
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]               = useState(null)  // { message, variant }

  function showToast(message, variant = 'ok') { setToast({ message, variant }) }

  const sessionCountByUser = useMemo(() =>
    sessions.reduce((acc, s) => { acc[s.userId] = (acc[s.userId] || 0) + 1; return acc }, {}),
    [sessions]
  )

  async function handleConfirm() {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.type === 'one') {
        await revokeSession(confirm.session.id)
        showToast(`Session for ${confirm.session.email} revoked`)
      } else {
        await revokeAllForUser(confirm.session.userId)
        showToast(`All sessions for ${confirm.session.email} revoked`)
      }
    } catch (ex) {
      showToast(ex?.message ?? 'Action failed', 'err')
    } finally {
      setActionLoading(false)
      setConfirm(null)
    }
  }

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">Sessions</div>
          <div className="page-sub">
            {loading ? 'Loading…'
              : error ? 'Error loading'
              : !sessions.length ? 'No active sessions'
              : `Active sessions · ${sessions.length} total`}
          </div>
        </div>
      </div>

      <div className="content-body">
        <div className="table-wrap">
          {error ? (
            <div className="admin-error">
              Could not load sessions.{' '}
              <span onClick={reload} style={{ cursor: 'pointer', color: 'var(--teal)', marginLeft: 'auto' }}>
                Retry ↺
              </span>
            </div>
          ) : loading ? (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Created</th>
                  <th>Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-cell">
                        <div className="skel" style={{ height: 11, width: 140 + (i % 3) * 20 }} />
                      </div>
                    </td>
                    <td><div className="skel" style={{ height: 11, width: 90 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 110 + (i % 2) * 15 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 75 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 60 }} /></td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !sessions.length ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <div className="empty-ico" style={{ fontSize: 28, opacity: 0.35 }}>🖥</div>
              <div className="empty-ttl" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 12 }}>
                No active sessions
              </div>
              <div className="empty-sub" style={{ fontSize: 11 }}>
                There are no active sessions at the moment.
              </div>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Created</th>
                  <th>Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-email">{s.email}</span>
                        {s.current && (
                          <span className="badge badge-active" style={{ marginLeft: 6 }}>
                            ● Current session
                          </span>
                        )}
                      </div>
                    </td>
                    <td><span className="date-cell">{s.ip}</span></td>
                    <td><span className="date-cell">{parseUA(s.userAgent)}</span></td>
                    <td><span className="date-cell">{fmtDate(s.createdAt)}</span></td>
                    <td><span className="date-cell">{fmtRelative(s.lastSeenAt)}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      {s.current ? (
                        <span
                          className="badge badge-active"
                          title="Cannot revoke your own active session"
                          style={{ cursor: 'default' }}
                        >
                          You
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn-sm danger"
                            onClick={() => setConfirm({ type: 'one', session: s })}
                          >
                            Revoke
                          </button>
                          {sessionCountByUser[s.userId] > 1 && (
                            <button
                              className="btn-sm danger"
                              onClick={() => setConfirm({ type: 'all', session: s })}
                            >
                              Revoke all
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'one' ? 'Revoke session?' : 'Revoke all sessions?'}
          body={
            confirm.type === 'one'
              ? <>
                  The session for <strong>{confirm.session.email}</strong> from IP{' '}
                  <strong>{confirm.session.ip}</strong> will be terminated immediately.
                </>
              : <>
                  All sessions for <strong>{confirm.session.email}</strong> will be terminated.
                  The user will be signed out from all devices. Your own session will not be affected.
                </>
          }
          confirmLabel={confirm.type === 'one' ? 'Revoke session' : 'Revoke all'}
          confirmClass="danger"
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

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Toast from '../../components/admin/Toast.jsx'
import useSessions from '../../hooks/useSessions.js'
import { useAuth } from '../../hooks/useAuth.jsx'

/* ─── Formatters ─────────────────────────────────────────────────── */

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
  if (/Edg\//.test(ua))     browser = 'Edge'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua))  browser = 'Chrome'
  else if (/Safari\//.test(ua))  browser = 'Safari'
  let os = ''
  if (/iPhone/.test(ua))              os = 'iOS'
  else if (/iPad/.test(ua))           os = 'iPadOS'
  else if (/Android/.test(ua))        os = 'Android'
  else if (/Windows/.test(ua))        os = 'Windows'
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua))          os = 'Linux'
  return os ? `${browser} · ${os}` : browser
}

/* ─── Role filter config ─────────────────────────────────────────── */

const ROLE_FILTERS = [
  { key: 'all',   label: 'All'   },
  { key: 'user',  label: 'User'  },
  { key: 'admin', label: 'Admin' },
]

/* ─── Self-revoke warning modal (with countdown) ─────────────────── */

function SelfRevokeModal({ session, countdown, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">⚠ Revoke current session?</div>
        <div className="modal-body">
          You are about to revoke <strong>your own active session</strong> from IP{' '}
          <strong>{session.ip}</strong>.<br /><br />
          You will be signed out from this device immediately and will need to log in again.
        </div>
        <div className="modal-actions">
          <button className="btn-modal cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-modal warn"
            onClick={onConfirm}
            disabled={loading || countdown > 0}
          >
            {loading
              ? <span className="spin" style={{ width: 12, height: 12 }} />
              : countdown > 0
                ? `Wait ${countdown}s…`
                : 'Revoke session'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function SessionsList() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const {
    sessions, loading, error,
    revokeSession, revokeAllForUser, revokeBulkSessions, reload,
  } = useSessions()

  const [roleFilter, setRoleFilter]       = useState('all')
  const [selectedIds, setSelectedIds]     = useState(new Set())
  // confirm: { type: 'one'|'all'|'self'|'bulk', session?, ids? }
  const [confirm, setConfirm]             = useState(null)
  const [countdown, setCountdown]         = useState(0)
  const countdownRef                      = useRef(null)
  const headerCheckRef                    = useRef(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState(null)

  /* Filtered list */
  const filteredSessions = useMemo(() => {
    if (roleFilter === 'all') return sessions
    return sessions.filter(s => s.role === roleFilter)
  }, [sessions, roleFilter])

  /* Reset selection when filter changes */
  useEffect(() => { setSelectedIds(new Set()) }, [roleFilter])

  /* Countdown for self-revoke modal */
  useEffect(() => {
    if (confirm?.type === 'self') {
      setCountdown(5)
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownRef.current); return 0 }
          return c - 1
        })
      }, 1000)
    } else {
      clearInterval(countdownRef.current)
      setCountdown(0)
    }
    return () => clearInterval(countdownRef.current)
  }, [confirm?.type])

  /* Header checkbox indeterminate state */
  const selectableSessions = filteredSessions.filter(s => !s.current)
  const allSelected  = selectableSessions.length > 0 && selectableSessions.every(s => selectedIds.has(s.id))
  const someSelected = !allSelected && selectableSessions.some(s => selectedIds.has(s.id))

  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someSelected
  }, [someSelected])

  /* Sessions per user (for "Revoke all" button visibility) */
  const sessionCountByUser = useMemo(() =>
    sessions.reduce((acc, s) => { acc[s.userId] = (acc[s.userId] || 0) + 1; return acc }, {}),
    [sessions]
  )

  /* Selection helpers */
  function toggleRow(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(selectableSessions.map(s => s.id)))
  }

  function showToast(msg, variant = 'ok') { setToast({ message: msg, variant }) }

  /* Action dispatcher */
  async function handleConfirm() {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.type === 'self') {
        await revokeSession(confirm.session.id)
        await signOut()
        navigate('/login', { replace: true })
        return
      } else if (confirm.type === 'one') {
        await revokeSession(confirm.session.id)
        showToast(`Session for ${confirm.session.email} revoked`)
      } else if (confirm.type === 'all') {
        await revokeAllForUser(confirm.session.userId)
        showToast(`All sessions for ${confirm.session.email} revoked`)
      } else if (confirm.type === 'bulk') {
        const ids = [...confirm.ids]
        await revokeBulkSessions(ids)
        setSelectedIds(new Set())
        showToast(`${ids.length} session${ids.length > 1 ? 's' : ''} revoked`)
      }
    } catch (ex) {
      showToast(ex?.message ?? 'Action failed', 'err')
    } finally {
      setActionLoading(false)
      setConfirm(null)
    }
  }

  const selectedCount = selectedIds.size

  return (
    <AdminShell>
      {/* ── Header ── */}
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

        <div className="header-actions">
          {selectedCount > 0 && (
            <button
              className="btn-sm"
              style={{ color: 'var(--err)', borderColor: 'rgba(239,68,68,0.35)' }}
              onClick={() => setConfirm({ type: 'bulk', ids: new Set(selectedIds) })}
            >
              Revoke selected ({selectedCount})
            </button>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {ROLE_FILTERS.map(f => (
              <button
                key={f.key}
                className={`btn-sm ${roleFilter === f.key ? 'pri' : 'sec'}`}
                onClick={() => setRoleFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="content-body">
        <div className="table-wrap">

          {/* Error */}
          {error ? (
            <div className="admin-error">
              Could not load sessions.{' '}
              <span onClick={reload} style={{ cursor: 'pointer', color: 'var(--teal)', marginLeft: 'auto' }}>
                Retry ↺
              </span>
            </div>

          /* Skeleton */
          ) : loading ? (
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>User</th>
                  <th>Role</th>
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
                    <td style={{ paddingLeft: 14 }}>
                      <div className="skel" style={{ height: 12, width: 12, borderRadius: 2 }} />
                    </td>
                    <td>
                      <div className="skel" style={{ height: 11, width: 140 + (i % 3) * 20 }} />
                    </td>
                    <td><div className="skel" style={{ height: 11, width: 48 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 90 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 110 + (i % 2) * 15 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 75 }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 60 }} /></td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>

          /* Empty */
          ) : !filteredSessions.length ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <div className="empty-ico" style={{ fontSize: 28, opacity: 0.35 }}>🖥</div>
              <div className="empty-ttl" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 12 }}>
                {sessions.length ? 'No sessions match this filter' : 'No active sessions'}
              </div>
              <div className="empty-sub" style={{ fontSize: 11 }}>
                {sessions.length
                  ? 'Try a different role filter.'
                  : 'There are no active sessions at the moment.'}
              </div>
            </div>

          /* Table */
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 36, paddingLeft: 14 }}>
                    <input
                      type="checkbox"
                      ref={headerCheckRef}
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ accentColor: 'var(--acc)', cursor: 'pointer' }}
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Created</th>
                  <th>Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(s => (
                  <tr key={s.id}>
                    {/* Checkbox — disabled for current session (excluded from bulk) */}
                    <td style={{ paddingLeft: 14 }}>
                      {!s.current ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleRow(s.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ accentColor: 'var(--acc)', cursor: 'pointer' }}
                        />
                      ) : (
                        <span style={{ display: 'inline-block', width: 13 }} />
                      )}
                    </td>

                    {/* User — email + CURRENT badge on second line */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="user-email">{s.email}</span>
                        {s.current && (
                          <span
                            className="badge badge-active"
                            style={{ fontSize: 9, alignSelf: 'flex-start' }}
                          >
                            ● Current session
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role badge */}
                    <td>
                      <span className={`badge ${s.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {s.role}
                      </span>
                    </td>

                    <td><span className="date-cell">{s.ip}</span></td>
                    <td><span className="date-cell">{parseUA(s.userAgent)}</span></td>
                    <td><span className="date-cell">{fmtDate(s.createdAt)}</span></td>
                    <td><span className="date-cell">{fmtRelative(s.lastSeenAt)}</span></td>

                    {/* Actions */}
                    <td onClick={e => e.stopPropagation()}>
                      {s.current ? (
                        /* Current session: warn-style revoke button */
                        <button
                          className="btn-sm"
                          style={{ color: 'var(--warn)', borderColor: 'rgba(245,158,11,0.35)' }}
                          onClick={() => setConfirm({ type: 'self', session: s })}
                        >
                          Revoke
                        </button>
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

      {/* ── Standard confirm modals (one / all / bulk) ── */}
      {confirm && confirm.type !== 'self' && (
        <ConfirmModal
          title={
            confirm.type === 'bulk'
              ? `Revoke ${confirm.ids.size} session${confirm.ids.size > 1 ? 's' : ''}?`
              : confirm.type === 'all'
                ? 'Revoke all sessions?'
                : 'Revoke session?'
          }
          body={
            confirm.type === 'one'
              ? <>
                  The session for <strong>{confirm.session.email}</strong> from IP{' '}
                  <strong>{confirm.session.ip}</strong> will be terminated immediately.
                </>
              : confirm.type === 'all'
              ? <>
                  All sessions for <strong>{confirm.session.email}</strong> will be terminated.{' '}
                  The user will be signed out from all devices.
                </>
              : /* bulk */ <>
                  <strong>{confirm.ids.size}</strong> selected session{confirm.ids.size > 1 ? 's' : ''} will be
                  terminated immediately. Affected users will be signed out on those devices.
                </>
          }
          confirmLabel={
            confirm.type === 'bulk'
              ? `Revoke ${confirm.ids.size}`
              : confirm.type === 'all'
                ? 'Revoke all'
                : 'Revoke session'
          }
          confirmClass="danger"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {/* ── Self-revoke warning modal with 5-sec countdown ── */}
      {confirm?.type === 'self' && (
        <SelfRevokeModal
          session={confirm.session}
          countdown={countdown}
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

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import IdTag from '../../components/admin/IdTag.jsx'
import Toast from '../../components/admin/Toast.jsx'
import useSessions from '../../hooks/useSessions.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useT } from '../../i18n/index.jsx'

/* ─── Formatters ─────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtRelative(iso, t) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('just now')
  if (minutes < 60) return t('{n}m ago', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('{n}h ago', { n: hours })
  return fmtDate(iso)
}

/* ─── Role filter config ─────────────────────────────────────────── */

const ROLE_FILTERS = [
  { key: 'all',   label: 'All'   },
  { key: 'user',  label: 'User'  },
  { key: 'admin', label: 'Admin' },
]

/* ─── Self-revoke warning modal (with countdown) ─────────────────── */

function SelfRevokeModal({ session, countdown, onConfirm, onCancel, loading }) {
  const t = useT()
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{t('⚠ Revoke current session?')}</div>
        <div className="modal-body">
          {t('You are about to revoke')} <strong>{t('your own active session')}</strong> {t('from IP')}{' '}
          <strong>{session.ip}</strong>.<br /><br />
          {t('You will be signed out from this device immediately and will need to log in again.')}
        </div>
        <div className="modal-actions">
          <button className="btn-modal cancel" onClick={onCancel} disabled={loading}>
            {t('Cancel')}
          </button>
          <button
            className="btn-modal warn"
            onClick={onConfirm}
            disabled={loading || countdown > 0}
          >
            {loading
              ? <span className="spin" style={{ width: 12, height: 12 }} />
              : countdown > 0
                ? t('Wait {n}s…', { n: countdown })
                : t('Revoke session')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function SessionsList() {
  const { signOut } = useAuth()
  const t = useT()
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
        showToast(t('Session for {email} revoked', { email: confirm.session.email }))
      } else if (confirm.type === 'all') {
        await revokeAllForUser(confirm.session.userId)
        showToast(t('All sessions for {email} revoked', { email: confirm.session.email }))
      } else if (confirm.type === 'bulk') {
        const ids = [...confirm.ids]
        await revokeBulkSessions(ids)
        setSelectedIds(new Set())
        showToast(t('{n} sessions revoked', { n: ids.length }))
      }
    } catch (ex) {
      showToast(ex?.message ?? t('Action failed'), 'err')
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
          <div className="page-title">{t('Sessions')}</div>
          <div className="page-sub">
            {loading ? t('Loading…')
              : error ? t('Error loading')
              : !sessions.length ? t('No active sessions')
              : t('Active sessions · {n} total', { n: sessions.length })}
          </div>
        </div>

        <div className="header-actions">
          {selectedCount > 0 && (
            <button
              className="btn-sm"
              style={{ color: 'var(--err)', borderColor: 'rgba(239,68,68,0.35)' }}
              onClick={() => setConfirm({ type: 'bulk', ids: new Set(selectedIds) })}
            >
              {t('Revoke selected ({n})', { n: selectedCount })}
            </button>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            {ROLE_FILTERS.map(f => (
              <button
                key={f.key}
                className={`btn-sm ${roleFilter === f.key ? 'pri' : 'sec'}`}
                onClick={() => setRoleFilter(f.key)}
              >
                {t(f.label)}
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
              {t('Could not load sessions.')}{' '}
              <span onClick={reload} style={{ cursor: 'pointer', color: 'var(--teal)', marginLeft: 'auto' }}>
                {t('Retry ↺')}
              </span>
            </div>

          /* Skeleton */
          ) : loading ? (
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>{t('User')}</th>
                  <th>{t('Role')}</th>
                  <th>{t('IP')}</th>
                  <th>{t('Created')}</th>
                  <th>{t('Last seen')}</th>
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
                {sessions.length ? t('No sessions match this filter') : t('No active sessions')}
              </div>
              <div className="empty-sub" style={{ fontSize: 11 }}>
                {sessions.length
                  ? t('Try a different role filter.')
                  : t('There are no active sessions at the moment.')}
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
                      title={allSelected ? t('Deselect all') : t('Select all')}
                    />
                  </th>
                  <th>{t('User')}</th>
                  <th>{t('Role')}</th>
                  <th>{t('IP')}</th>
                  <th>{t('Created')}</th>
                  <th>{t('Last seen')}</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', minWidth: 0 }}>
                        <span className="user-email">{s.email}</span>
                        <IdTag id={s.id} />
                        {s.current && (
                          <span
                            className="badge badge-active"
                            style={{ fontSize: 9, alignSelf: 'flex-start' }}
                          >
                            {t('● Current session')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role badge */}
                    <td>
                      <span className={`badge ${s.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {t(s.role.charAt(0).toUpperCase() + s.role.slice(1))}
                      </span>
                    </td>

                    <td><span className="date-cell">{s.ip}</span></td>
                    <td><span className="date-cell">{fmtDate(s.createdAt)}</span></td>
                    <td><span className="date-cell">{fmtRelative(s.lastSeenAt, t)}</span></td>

                    {/* Actions */}
                    <td onClick={e => e.stopPropagation()}>
                      {s.current ? (
                        /* Current session: warn-style revoke button */
                        <button
                          className="btn-sm"
                          style={{ color: 'var(--warn)', borderColor: 'rgba(245,158,11,0.35)' }}
                          onClick={() => setConfirm({ type: 'self', session: s })}
                        >
                          {t('Revoke')}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="btn-sm danger"
                            onClick={() => setConfirm({ type: 'one', session: s })}
                          >
                            {t('Revoke')}
                          </button>
                          {sessionCountByUser[s.userId] > 1 && (
                            <button
                              className="btn-sm danger"
                              onClick={() => setConfirm({ type: 'all', session: s })}
                            >
                              {t('Revoke all')}
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
              ? t('Revoke {n} sessions?', { n: confirm.ids.size })
              : confirm.type === 'all'
                ? t('Revoke all sessions?')
                : t('Revoke session?')
          }
          body={
            confirm.type === 'one'
              ? <>
                  {t('The session for')} <strong>{confirm.session.email}</strong> {t('from IP')}{' '}
                  <strong>{confirm.session.ip}</strong> {t('will be terminated immediately.')}
                </>
              : confirm.type === 'all'
              ? <>
                  {t('All sessions for')} <strong>{confirm.session.email}</strong>{' '}
                  {t('will be terminated. The user will be signed out from all devices.')}
                </>
              : /* bulk */ <>
                  <strong>{confirm.ids.size}</strong>{' '}
                  {t('selected sessions will be terminated immediately. Affected users will be signed out on those devices.')}
                </>
          }
          confirmLabel={
            confirm.type === 'bulk'
              ? t('Revoke {n}', { n: confirm.ids.size })
              : confirm.type === 'all'
                ? t('Revoke all')
                : t('Revoke session')
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

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import Toast from '../../components/admin/Toast.jsx'
import useUsers from '../../hooks/useUsers.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as api from '../../api/admin.js'
import { ROLE_LABELS } from '../../constants/roles.js'
import { useT } from '../../i18n/index.jsx'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(email) {
  const parts = email.split('@')[0].split(/[._-]/)
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? '')).toUpperCase()
}

function RowDropdown({ user, onBlock, onUnblock, onReset, onDelete, onView, onChangeRole, isSelf }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const t = useT()

  useEffect(() => {
    if (!open) return
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="actions-btn"
        aria-label={t('User actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >···</button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={() => { setOpen(false); onView() }}>{t('👁 View profile')}</div>
          <div className="dropdown-sep" />
          {!isSelf && (user.status === 'blocked'
            ? <div className="dropdown-item" onClick={() => { setOpen(false); onUnblock() }}>{t('🔓 Unblock user')}</div>
            : <div className="dropdown-item" onClick={() => { setOpen(false); onBlock() }}>{t('🔒 Block user')}</div>
          )}
          {!isSelf && (
            user.role === 'user'
              ? <div className="dropdown-item" onClick={() => { setOpen(false); onChangeRole('admin') }}>{t('👑 Make Admin')}</div>
              : <div className="dropdown-item" onClick={() => { setOpen(false); onChangeRole('user') }}>{t('👤 Make User')}</div>
          )}
          <div className="dropdown-item" onClick={() => { setOpen(false); onReset() }}>{t('🔑 Reset password')}</div>
          {!isSelf && (
            <>
              <div className="dropdown-sep" />
              <div className="dropdown-item danger" onClick={() => { setOpen(false); onDelete() }}>{t('🗑 Delete')}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InviteModal({ onClose, onInvite }) {
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('user')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState(null)
  const t = useT()

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setErr(null)
    try {
      await onInvite(email.trim(), role)
      onClose()
    } catch (ex) {
      setErr(ex?.error?.message ?? t('Failed to invite user'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{t('Invite User')}</div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <div className="sett-label" style={{ marginBottom: 5 }}>{t('Email')}</div>
            <input
              className="sett-input"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="sett-label" style={{ marginBottom: 5 }}>{t('Role')}</div>
            <select className="sett-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="user">{t('User')}</option>
              <option value="admin">{t('Admin')}</option>
            </select>
          </div>
          {err && <div style={{ fontSize: 11, color: 'var(--err)', marginBottom: 12 }}>{err}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-modal cancel" onClick={onClose}>{t('Cancel')}</button>
            <button type="submit" className="btn-modal warn" disabled={loading}>
              {loading ? <span className="spin" style={{ width: 12, height: 12 }} /> : null}
              {t('Invite')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersList() {
  const navigate = useNavigate()
  const { user: authUser, accessToken } = useAuth()
  const t = useT()

  const {
    users, total, totalPages, loading, error,
    filters, updateFilters, setPage,
    blockUser, unblockUser, resetPassword, deleteUser, inviteUser,
    optimisticSetRole,
  } = useUsers()

  const [confirm, setConfirm]         = useState(null)  // { type, user, targetRole? }
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]             = useState(null)   // { message, variant }
  const [showInvite, setShowInvite]   = useState(false)

  function showToast(message, variant = 'ok') { setToast({ message, variant }) }

  /**
   * Apply role change directly (without modal) — used for demotion.
   * Optimistic update → API → rollback on error.
   */
  async function applyListRoleChange(targetUser, newRole) {
    const prevRole = targetUser.role
    optimisticSetRole(targetUser.id, newRole)
    try {
      await api.changeRole(accessToken, targetUser.id, newRole)
      showToast(t('{email} is now {role}', { email: targetUser.email, role: t(ROLE_LABELS[newRole]) }))
    } catch {
      optimisticSetRole(targetUser.id, prevRole)
      showToast(t('Failed to change role — please try again'), 'err')
    }
  }

  /**
   * Entry point from RowDropdown.
   * Promotion to 'admin' requires confirmation; demotion is direct.
   */
  function handleRoleChangeInList(targetUser, newRole) {
    if (newRole === 'admin') {
      setConfirm({ type: 'role', user: targetUser, targetRole: 'admin' })
      return
    }
    applyListRoleChange(targetUser, newRole)
  }

  async function handleConfirm() {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.type === 'block') {
        await blockUser(confirm.user.id)
        showToast(t('{email} has been blocked', { email: confirm.user.email }))
      } else if (confirm.type === 'unblock') {
        await unblockUser(confirm.user.id)
        showToast(t('{email} has been unblocked', { email: confirm.user.email }))
      } else if (confirm.type === 'delete') {
        await deleteUser(confirm.user.id)
        showToast(t('{email} deleted', { email: confirm.user.email }))
      } else if (confirm.type === 'role') {
        // Promotion confirmed — optimistic update + API + rollback on error
        const prevRole = confirm.user.role
        optimisticSetRole(confirm.user.id, confirm.targetRole)
        try {
          await api.changeRole(accessToken, confirm.user.id, confirm.targetRole)
          showToast(t('{email} is now {role}', { email: confirm.user.email, role: t(ROLE_LABELS[confirm.targetRole]) }))
        } catch {
          optimisticSetRole(confirm.user.id, prevRole)
          showToast(t('Failed to change role — please try again'), 'err')
        }
      }
    } finally {
      setActionLoading(false)
      setConfirm(null)
    }
  }

  async function handleReset(user) {
    const res = await resetPassword(user.id)
    showToast(t('Reset email sent to {email}', { email: res.email ?? user.email }))
  }

  const hasFilters = filters.search || filters.role || filters.status
  const from = (filters.page - 1) * 20 + 1
  const to   = Math.min(filters.page * 20, total)

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">{t('Users')}</div>
          <div className="page-sub">
            {loading ? t('Loading…')
              : error ? t('Error loading')
              : hasFilters && !users.length ? t('No results')
              : !users.length ? t('No users yet')
              : t('Manage accounts · {n} total', { n: total })}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-sm pri" onClick={() => setShowInvite(true)}>{t('+ Invite User')}</button>
        </div>
      </div>

      <div className="content-body">
        {/* Search bar */}
        <div className="search-bar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder={t('Search by email…')}
              value={filters.search}
              onChange={e => updateFilters({ search: e.target.value })}
            />
          </div>
          <select
            className="filter-select"
            value={filters.role}
            onChange={e => updateFilters({ role: e.target.value })}
          >
            <option value="">{t('All roles')}</option>
            <option value="admin">{t('Admin')}</option>
            <option value="user">{t('User')}</option>
          </select>
          <select
            className="filter-select"
            value={filters.status}
            onChange={e => updateFilters({ status: e.target.value })}
          >
            <option value="">{t('All statuses')}</option>
            <option value="active">{t('Active')}</option>
            <option value="blocked">{t('Blocked')}</option>
          </select>
          {hasFilters && (
            <span
              className="reset-link"
              onClick={() => updateFilters({ search: '', role: '', status: '' })}
            >
              {t('Reset filters')}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <table className="users-table">
              <thead>
                <tr><th>{t('User')}</th><th>{t('Role')}</th><th>{t('Status')}</th><th>{t('Created At')}</th><th /></tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-cell">
                        <div className="skel" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                        <div className="skel" style={{ height: 11, width: 140 + (i % 3) * 20 }} />
                      </div>
                    </td>
                    <td><div className="skel" style={{ height: 18, width: 50, borderRadius: 'var(--rpill)' }} /></td>
                    <td><div className="skel" style={{ height: 18, width: 55, borderRadius: 'var(--rpill)' }} /></td>
                    <td><div className="skel" style={{ height: 11, width: 80 }} /></td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !users.length ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <div className="empty-ico" style={{ fontSize: 28, opacity: 0.35 }}>
                {hasFilters ? '🔍' : '👥'}
              </div>
              <div className="empty-ttl" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 12 }}>
                {hasFilters ? t('No users found') : t('No users yet')}
              </div>
              <div className="empty-sub" style={{ fontSize: 11 }}>
                {hasFilters
                  ? <>{t('No results for')} "{filters.search || t('current filters')}". <span className="reset-link" onClick={() => updateFilters({ search: '', role: '', status: '' })}>{t('Reset filters')}</span>.</>
                  : t('Invite the first user to get started.')}
              </div>
              {!hasFilters && (
                <button className="btn-sm pri" style={{ marginTop: 8 }} onClick={() => setShowInvite(true)}>
                  {t('+ Invite User')}
                </button>
              )}
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr><th>{t('User')}</th><th>{t('Role')}</th><th>{t('Status')}</th><th>{t('Created At')}</th><th /></tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = authUser?.id === u.id
                  return (
                    <tr key={u.id} onClick={() => navigate(`/admin/users/${u.id}`)}>
                      <td>
                        <div className="user-cell">
                          <div className={`user-av ${u.role}`}>{initials(u.email)}</div>
                          <span className="user-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${u.role}`}>
                          {t(ROLE_LABELS[u.role])}
                        </span>
                        {isSelf && (
                          <span
                            style={{ marginLeft: 4, fontSize: 10, color: 'var(--muted)', cursor: 'help', userSelect: 'none' }}
                            title={t('You cannot change your own role')}
                          >
                            🔒
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${u.status}`}>
                          {t(u.status.charAt(0).toUpperCase() + u.status.slice(1))}
                        </span>
                      </td>
                      <td><span className="date-cell">{fmtDate(u.createdAt)}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <RowDropdown
                          user={u}
                          isSelf={isSelf}
                          onView={() => navigate(`/admin/users/${u.id}`)}
                          onBlock={() => setConfirm({ type: 'block', user: u })}
                          onUnblock={() => setConfirm({ type: 'unblock', user: u })}
                          onReset={() => handleReset(u)}
                          onDelete={() => setConfirm({ type: 'delete', user: u })}
                          onChangeRole={newRole => handleRoleChangeInList(u, newRole)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 20 && (
          <div className="pagination">
            <span className="page-info">{t('Showing {from}–{to} of {total}', { from, to, total })}</span>
            <div className="page-btns">
              <button
                className="page-btn"
                disabled={filters.page <= 1}
                onClick={() => setPage(filters.page - 1)}
              >{t('← Prev')}</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    className={`page-btn${filters.page === p ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                )
              })}
              {totalPages > 5 && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>…</span>
                  <button className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                </>
              )}
              <button
                className="page-btn"
                disabled={filters.page >= totalPages}
                onClick={() => setPage(filters.page + 1)}
              >{t('Next →')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modals: block / unblock / delete / role-promotion */}
      {confirm && (
        <ConfirmModal
          title={
            confirm.type === 'block'     ? t('Block user?')
            : confirm.type === 'unblock' ? t('Unblock user?')
            : confirm.type === 'delete'  ? t('Delete account?')
            : t('Promote to {role}?', { role: t(ROLE_LABELS[confirm.targetRole]) })
          }
          body={
            confirm.type === 'block'
              ? <><strong>{confirm.user.email}</strong> {t('will lose access immediately. All active sessions will be terminated. You can unblock them at any time.')}</>
              : confirm.type === 'unblock'
              ? <><strong>{confirm.user.email}</strong> {t('will regain access to the platform.')}</>
              : confirm.type === 'delete'
              ? <><strong>{confirm.user.email}</strong> {t('and all associated data will be permanently deleted. This action')} <strong>{t('cannot be undone')}</strong>.</>
              : /* role promotion */
                <>{t('Promote {email} to Admin? They will gain full administrative access to the platform, including user management.', { email: confirm.user.email })}</>
          }
          confirmLabel={
            confirm.type === 'block'     ? t('🔒 Block user')
            : confirm.type === 'unblock' ? t('🔓 Unblock user')
            : confirm.type === 'delete'  ? t('🗑 Delete permanently')
            : t('👑 Promote to Admin')
          }
          confirmClass={confirm.type === 'delete' ? 'danger' : 'warn'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={async (email, role) => { await inviteUser(email, role); showToast(t('Invite sent to {email}', { email })) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  )
}

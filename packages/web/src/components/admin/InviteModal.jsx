import { useState } from 'react'
import { useT } from '../../i18n/index.jsx'

/**
 * InviteModal — create a user by email + role (admin invite flow).
 * `onInvite(email, role)` should perform the API call and may throw;
 * the modal shows the error and stays open on failure, closes on success.
 */
export default function InviteModal({ onClose, onInvite }) {
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

import { useState } from 'react'
import AdminShell from '../../components/admin/AdminShell.jsx'
import Toast from '../../components/admin/Toast.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as api from '../../api/admin.js'
import { useT } from '../../i18n/index.jsx'

const TITLE_MAX = 200
const BODY_MAX = 2000

const TARGETS = [
  { value: 'all',   label: 'Everyone' },
  { value: 'user',  label: 'Regular users' },
  { value: 'admin', label: 'Admins only' },
]

export default function Broadcast() {
  const t = useT()
  const { accessToken } = useAuth()

  const [target, setTarget]   = useState('all')
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr]         = useState(null)
  const [toast, setToast]     = useState(null)

  const canSend = title.trim().length > 0 && !sending

  async function submit(e) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setErr(null)
    try {
      const res = await api.sendBroadcast(accessToken, {
        title: title.trim(),
        body: body.trim() || null,
        target,
      })
      setToast({ message: t('Broadcast sent to {n} users', { n: res.recipients }), variant: 'ok' })
      setTitle('')
      setBody('')
    } catch (ex) {
      setErr(ex?.error?.message ?? t('Failed to send broadcast'))
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">{t('Broadcast')}</div>
          <div className="page-sub">{t('Send a notification to your users')}</div>
        </div>
      </div>

      <div className="content-body">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="settings-section">
            <div className="sec-header">
              <div className="sec-title">{t('Compose')}</div>
              <div className="sec-desc">{t('Each recipient receives this as an in-app notification')}</div>
            </div>
            <div className="sec-body">
              <div className="sett-field" style={{ maxWidth: 280 }}>
                <div className="sett-label">{t('Audience')}</div>
                <select
                  className="sett-select"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {TARGETS.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.label)}</option>
                  ))}
                </select>
              </div>

              <div className="sett-field">
                <div className="sett-label">
                  {t('Title')}
                  <span className="bc-count">{title.length}/{TITLE_MAX}</span>
                </div>
                <input
                  className="sett-input"
                  value={title}
                  maxLength={TITLE_MAX}
                  placeholder={t('Scheduled maintenance tonight')}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="sett-field">
                <div className="sett-label">
                  {t('Message')} <span className="bc-opt">{t('(optional)')}</span>
                  <span className="bc-count">{body.length}/{BODY_MAX}</span>
                </div>
                <textarea
                  className="sett-input bc-textarea"
                  value={body}
                  maxLength={BODY_MAX}
                  rows={5}
                  placeholder={t('We will be performing maintenance from 02:00 to 03:00 UTC.')}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              {err && <div style={{ fontSize: 11, color: 'var(--err)' }}>{err}</div>}

              <div className="header-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="abtn pri" disabled={!canSend}>
                  {sending && <span className="spin" style={{ width: 12, height: 12 }} />}
                  <i className="ti ti-send" aria-hidden="true" />
                  {sending ? t('Sending…') : t('Send Broadcast')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  )
}

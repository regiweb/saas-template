import { useT } from '../../i18n/index.jsx'

export default function ConfirmModal({ title, body, confirmLabel, confirmClass = 'danger', onConfirm, onCancel, loading }) {
  const t = useT()
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{body}</div>
        <div className="modal-actions">
          <button className="btn-modal cancel" onClick={onCancel} disabled={loading}>
            {t('Cancel')}
          </button>
          <button className={`btn-modal ${confirmClass}`} onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spin" style={{ width: 12, height: 12 }} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

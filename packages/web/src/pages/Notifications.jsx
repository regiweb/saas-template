import { useT } from '../i18n/index.jsx'
import useNotifications from '../hooks/useNotifications.js'

function fmtRelative(iso, t) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return t('just now')
  if (minutes < 60) return t('{n}m ago', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('{n}h ago', { n: hours })
  const days = Math.floor(hours / 24)
  return t('{n}d ago', { n: days })
}

export default function Notifications() {
  const t = useT()
  const { items, unreadCount, loading, error, markRead, markAllRead } = useNotifications()

  return (
    <div className="ntf-page">
      <div className="ntf-head">
        <div>
          <h1 className="page-title">{t('Notifications')}</h1>
          <p className="ntf-sub">
            {unreadCount > 0 ? t('{n} unread', { n: unreadCount }) : t('All caught up')}
          </p>
        </div>
        <button
          className="ntf-readall"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <i className="ti ti-checks" aria-hidden="true" /> {t('Mark all read')}
        </button>
      </div>

      {loading ? (
        <div className="spin-page" />
      ) : error ? (
        <div className="empty-state">
          <i className="empty-ico ti ti-alert-triangle" aria-hidden="true" />
          <div className="empty-ttl">{t('Failed to load notifications.')}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <i className="empty-ico ti ti-bell-off" aria-hidden="true" />
          <div className="empty-ttl">{t('No notifications')}</div>
          <div className="empty-sub">{t('You have no notifications yet.')}</div>
        </div>
      ) : (
        <ul className="ntf-list">
          {items.map((n) => (
            <li
              key={n.id}
              className={`ntf-item${n.read ? '' : ' unread'}`}
            >
              <span className="ntf-dot" aria-hidden="true" />
              <div className="ntf-main">
                <div className="ntf-row">
                  <span className="ntf-title">{n.title}</span>
                  <span className="ntf-time">{fmtRelative(n.createdAt, t)}</span>
                </div>
                {n.body && <p className="ntf-body">{n.body}</p>}
                <div className="ntf-foot">
                  {n.type === 'broadcast' && (
                    <span className="badge badge-admin ntf-badge">{t('Broadcast')}</span>
                  )}
                  {!n.read && (
                    <button
                      className="ntf-read-btn"
                      onClick={() => markRead(n.id)}
                      aria-label={t('Mark read')}
                    >
                      <i className="ti ti-check" aria-hidden="true" /> {t('Mark read')}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

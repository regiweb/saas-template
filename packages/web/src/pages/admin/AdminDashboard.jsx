import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../../components/admin/AdminShell.jsx'
import MetricCard from '../../components/admin/MetricCard.jsx'
import ActivityFeed from '../../components/admin/ActivityFeed.jsx'
import InviteModal from '../../components/admin/InviteModal.jsx'
import Toast from '../../components/admin/Toast.jsx'
import useAdminDashboard from '../../hooks/useAdminDashboard.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as api from '../../api/admin.js'
import { useT } from '../../i18n/index.jsx'

function SkelMetric() {
  return (
    <div className="metric-card mc-n" style={{ gap: 8 }}>
      <div className="skel" style={{ height: 9, width: 70 }} />
      <div className="skel" style={{ height: 24, width: 60 }} />
      <div className="skel" style={{ height: 9, width: 50 }} />
    </div>
  )
}

function SkelFeedItem() {
  return (
    <div className="feed-item">
      <div className="skel" style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="skel" style={{ height: 10, width: '65%' }} />
        <div className="skel" style={{ height: 9, width: '45%' }} />
      </div>
      <div className="skel" style={{ height: 9, width: 44 }} />
    </div>
  )
}

export default function AdminDashboard() {
  const { data, loading, error, retry } = useAdminDashboard()
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const t = useT()

  const [showInvite, setShowInvite] = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [toast, setToast]           = useState(null)

  const isEmpty = !loading && !error && data?.totalUsers === 0

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      await api.exportUsers(accessToken)
      setToast({ message: t('Users exported'), variant: 'ok' })
    } catch (ex) {
      setToast({ message: ex?.error?.message ?? t('Export failed'), variant: 'err' })
    } finally {
      setExporting(false)
    }
  }

  async function handleInvite(email, role) {
    await api.inviteUser(accessToken, email, role)
    setToast({ message: t('Invite sent to {email}', { email }), variant: 'ok' })
    retry()  // refresh metrics + activity after adding a user
  }

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">{t('Dashboard')}</div>
          <div className="page-sub" style={error ? { color: 'var(--err)' } : {}}>
            {loading ? t('Loading…')
              : error   ? t('Failed to load')
              : isEmpty ? t('Nothing here yet')
              : t('Platform overview · updated just now')}
          </div>
        </div>
        {!loading && (
          <div className="header-actions">
            {!error && !isEmpty && (
              <button className="btn-sm sec" onClick={handleExport} disabled={exporting}>
                <i className="ti ti-download" aria-hidden="true" /> {exporting ? t('Exporting…') : t('Export')}
              </button>
            )}
            <button className="btn-sm pri" onClick={() => setShowInvite(true)}>
              <i className="ti ti-user-plus" aria-hidden="true" /> {t('Create User')}
            </button>
          </div>
        )}
      </div>

      <div className="content-body">
        {error && (
          <div className="admin-error">
            {t('⚠️ Could not load dashboard data. Check server status or your connection.')}
            <span
              style={{ color: 'var(--teal)', cursor: 'pointer', marginLeft: 'auto', fontSize: '10.5px', flexShrink: 0 }}
              onClick={retry}
            >
              {t('Retry ↺')}
            </span>
          </div>
        )}

        {/* Metrics */}
        <div className="metrics-grid" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <SkelMetric key={i} />)
          ) : (
            <>
              <MetricCard
                label={t('Total Users')}
                icon={<i className="ti ti-users" />}
                value={data?.totalUsers ?? 0}
                delta={data?.totalUsers
                  ? <><span className="up">↑ {data.newUsersWeek}</span> {t('this week')}</>
                  : t('no users yet')}
                variant={data?.totalUsers ? 'ok' : 'n'}
                valueClass={data?.totalUsers ? 'teal' : 'muted'}
              />
              <MetricCard
                label={t('Active Sessions')}
                icon={<i className="ti ti-device-desktop" />}
                value={data?.activeSessions ?? 0}
                delta={t('right now')}
                variant={data?.activeSessions ? 'ok' : 'n'}
                valueClass={data?.activeSessions ? 'teal' : 'muted'}
              />
              <MetricCard
                label={t('Failed Logins 24h')}
                icon={<i className="ti ti-alert-triangle" />}
                value={data?.failedLogins ?? 0}
                delta={data?.failedLogins
                  ? <><span className="dn">↑ {data.failedDelta}</span> {t('vs yesterday')}</>
                  : t('no attempts')}
                variant={data?.failedLogins ? 'warn' : 'n'}
                valueClass={data?.failedLogins ? 'warn' : 'muted'}
              />
              <MetricCard
                label={t('Blocked Accounts')}
                icon={<i className="ti ti-ban" />}
                value={data?.blockedUsers ?? 0}
                delta={data?.blockedUsers ? t('access revoked') : t('none blocked')}
                variant={data?.blockedUsers ? 'warn' : 'n'}
                valueClass={data?.blockedUsers ? 'warn' : 'muted'}
              />
            </>
          )}
        </div>

        {/* Bottom row */}
        <div className="bottom-row" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          <div className="feed-card">
            <div className="card-header">
              <span className="card-title">{t('Activity Feed')}</span>
              {!loading && (
                <span className="card-count">
                  {t('{n} events', { n: data?.activity?.length ?? 0 })}
                </span>
              )}
            </div>
            {loading ? (
              Array.from({ length: 4 }, (_, i) => <SkelFeedItem key={i} />)
            ) : error ? (
              <div className="empty-state"><div className="empty-ico"><i className="ti ti-inbox" /></div></div>
            ) : !data?.activity?.length ? (
              <div className="empty-state">
                <div className="empty-ico"><i className="ti ti-inbox" /></div>
                <div className="empty-ttl">{t('No activity yet')}</div>
                <div className="empty-sub">{t('Events appear here once users start registering and logging in')}</div>
              </div>
            ) : (
              <ActivityFeed items={data.activity} />
            )}
          </div>

          <div className="actions-card">
            <div className="card-header"><span className="card-title">{t('Quick Actions')}</span></div>
            {loading ? (
              <div className="action-list">
                {[0, 1].map(i => (
                  <div key={i} className="action-item">
                    <div className="skel" style={{ width: 30, height: 30, borderRadius: 'var(--r8)', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div className="skel" style={{ height: 11, width: 75 }} />
                      <div className="skel" style={{ height: 9, width: 110 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="action-list">
                <div className="action-item" role="button" tabIndex={0}
                  onClick={() => setShowInvite(true)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowInvite(true) } }}>
                  <div className="action-ico ico-teal"><i className="ti ti-user-plus" /></div>
                  <div>
                    <div className="action-name">{t('Create User')}</div>
                    <div className="action-desc">{isEmpty ? t('Add the first account') : t('Add a new account manually')}</div>
                  </div>
                  <span className="action-arr">›</span>
                </div>
                <div className="action-item" role="button" tabIndex={0}
                  onClick={handleExport}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExport() } }}>
                  <div className="action-ico ico-blue"><i className="ti ti-download" /></div>
                  <div>
                    <div className="action-name">{t('Export Users')}</div>
                    <div className="action-desc">{exporting ? t('Exporting…') : t('Download CSV of all accounts')}</div>
                  </div>
                  <span className="action-arr">›</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />
      )}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  )
}

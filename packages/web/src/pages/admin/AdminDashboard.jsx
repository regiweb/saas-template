import AdminShell from '../../components/admin/AdminShell.jsx'
import MetricCard from '../../components/admin/MetricCard.jsx'
import ActivityFeed from '../../components/admin/ActivityFeed.jsx'
import useAdminDashboard from '../../hooks/useAdminDashboard.js'

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

  const isEmpty = !loading && !error && data?.totalUsers === 0

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub" style={error ? { color: 'var(--err)' } : {}}>
            {loading ? 'Loading…'
              : error   ? 'Failed to load'
              : isEmpty ? 'Nothing here yet'
              : 'Platform overview · updated just now'}
          </div>
        </div>
        {!loading && (
          <div className="header-actions">
            {!error && !isEmpty && (
              <button className="btn-sm sec">📤 Export</button>
            )}
            <button className="btn-sm pri">+ Create User</button>
          </div>
        )}
      </div>

      <div className="content-body">
        {error && (
          <div className="admin-error">
            ⚠️ Could not load dashboard data. Check server status or your connection.
            <span
              style={{ color: 'var(--teal)', cursor: 'pointer', marginLeft: 'auto', fontSize: '10.5px', flexShrink: 0 }}
              onClick={retry}
            >
              Retry ↺
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
                label="Total Users"
                icon="👥"
                value={data?.totalUsers ?? 0}
                delta={data?.totalUsers
                  ? <><span className="up">↑ {data.newUsersWeek}</span> this week</>
                  : 'no users yet'}
                variant={data?.totalUsers ? 'ok' : 'n'}
                valueClass={data?.totalUsers ? 'teal' : 'muted'}
              />
              <MetricCard
                label="Active Sessions"
                icon="🟢"
                value={data?.activeSessions ?? 0}
                delta="right now"
                variant={data?.activeSessions ? 'ok' : 'n'}
                valueClass={data?.activeSessions ? 'teal' : 'muted'}
              />
              <MetricCard
                label="Failed Logins 24h"
                icon="⚠️"
                value={data?.failedLogins ?? 0}
                delta={data?.failedLogins
                  ? <><span className="dn">↑ {data.failedDelta}</span> vs yesterday</>
                  : 'no attempts'}
                variant={data?.failedLogins ? 'warn' : 'n'}
                valueClass={data?.failedLogins ? 'warn' : 'muted'}
              />
              <MetricCard
                label="System Uptime"
                icon="⏱"
                value={data?.uptime ?? '99.8%'}
                delta="last 30 days"
                variant="n"
                valueClass=""
              />
            </>
          )}
        </div>

        {/* Bottom row */}
        <div className="bottom-row" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          <div className="feed-card">
            <div className="card-header">
              <span className="card-title">Activity Feed</span>
              {!loading && (
                <span className="card-count">
                  {data?.activity?.length ?? 0} events
                </span>
              )}
            </div>
            {loading ? (
              Array.from({ length: 4 }, (_, i) => <SkelFeedItem key={i} />)
            ) : error ? (
              <div className="empty-state"><div className="empty-ico">📭</div></div>
            ) : !data?.activity?.length ? (
              <div className="empty-state">
                <div className="empty-ico">📭</div>
                <div className="empty-ttl">No activity yet</div>
                <div className="empty-sub">Events appear here once users start registering and logging in</div>
              </div>
            ) : (
              <ActivityFeed items={data.activity} />
            )}
          </div>

          <div className="actions-card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
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
                <div className="action-item">
                  <div className="action-ico ico-teal">👤</div>
                  <div>
                    <div className="action-name">Create User</div>
                    <div className="action-desc">{isEmpty ? 'Add the first account' : 'Add a new account manually'}</div>
                  </div>
                  <span className="action-arr">›</span>
                </div>
                <div className="action-item">
                  <div className="action-ico ico-blue">📤</div>
                  <div>
                    <div className="action-name">Export Users</div>
                    <div className="action-desc">Download CSV of all accounts</div>
                  </div>
                  <span className="action-arr">›</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

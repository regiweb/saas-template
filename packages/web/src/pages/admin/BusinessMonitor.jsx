import AdminShell from '../../components/admin/AdminShell.jsx'
import MetricCard from '../../components/admin/MetricCard.jsx'
import useBusinessMetrics from '../../hooks/useBusinessMetrics.js'
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

function shortDay(iso) {
  // "2026-06-29" → "29/06"
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function SignupsChart({ series, t }) {
  const max = Math.max(1, ...series.map((p) => p.count))
  return (
    <div className="biz-card">
      <div className="card-header">
        <span className="card-title">{t('Signups · last 14 days')}</span>
        <span className="card-count">{t('{n} total', { n: series.reduce((s, p) => s + p.count, 0) })}</span>
      </div>
      <div className="biz-bars" role="img" aria-label={t('Signups · last 14 days')}>
        {series.map((p) => (
          <div key={p.day} className="biz-bar-col" title={`${shortDay(p.day)} · ${p.count}`}>
            <div className="biz-bar-track">
              <div
                className={`biz-bar-fill${p.count === 0 ? ' empty' : ''}`}
                style={{ height: `${(p.count / max) * 100}%` }}
              />
            </div>
            <span className="biz-bar-lbl">{shortDay(p.day).slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Breakdown({ title, rows, t }) {
  const total = Math.max(1, rows.reduce((s, r) => s + r.count, 0))
  return (
    <div className="biz-card">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="biz-breakdown">
        {rows.length === 0 ? (
          <div className="biz-empty">{t('No data')}</div>
        ) : rows.map((r) => (
          <div key={r.label} className="biz-row">
            <span className="biz-row-lbl">{r.label}</span>
            <div className="biz-row-track">
              <div className="biz-row-fill" style={{ width: `${(r.count / total) * 100}%` }} />
            </div>
            <span className="biz-row-val">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BusinessMonitor() {
  const t = useT()
  const { data, loading, error, retry } = useBusinessMetrics()

  const roleRows = (data?.byRole ?? []).map((r) => ({ label: t(r.role === 'admin' ? 'Admins' : 'Users'), count: r.count }))
  const statusRows = (data?.byStatus ?? []).map((r) => ({ label: t(r.status === 'blocked' ? 'Blocked' : 'Active'), count: r.count }))

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">{t('Business')}</div>
          <div className="page-sub" style={error ? { color: 'var(--err)' } : {}}>
            {loading ? t('Loading…') : error ? t('Failed to load') : t('Growth and account KPIs')}
          </div>
        </div>
        {!loading && (
          <div className="header-actions">
            <button className="btn-sm sec" onClick={retry}>
              <i className="ti ti-refresh" aria-hidden="true" /> {t('Refresh')}
            </button>
          </div>
        )}
      </div>

      <div className="content-body">
        {error && (
          <div className="admin-error">
            {t('⚠️ Could not load business metrics. Check server status or your connection.')}
            <span
              style={{ color: 'var(--teal)', cursor: 'pointer', marginLeft: 'auto', fontSize: '10.5px', flexShrink: 0 }}
              onClick={retry}
            >
              {t('Retry ↺')}
            </span>
          </div>
        )}

        <div className="metrics-grid" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <SkelMetric key={i} />)
          ) : (
            <>
              <MetricCard
                label={t('Total Users')}
                icon={<i className="ti ti-users" />}
                value={data?.totalUsers ?? 0}
                delta={t('all time')}
                variant="ok"
                valueClass="teal"
              />
              <MetricCard
                label={t('New Today')}
                icon={<i className="ti ti-user-plus" />}
                value={data?.newToday ?? 0}
                delta={t('{n} this week', { n: data?.newWeek ?? 0 })}
                variant="n"
              />
              <MetricCard
                label={t('New This Month')}
                icon={<i className="ti ti-calendar-stats" />}
                value={data?.newMonth ?? 0}
                delta={t('last 30 days')}
                variant="n"
              />
              <MetricCard
                label={t('Active Users')}
                icon={<i className="ti ti-activity" />}
                value={data?.activeUsers ?? 0}
                delta={t('{n} events · 7d', { n: data?.activity7d ?? 0 })}
                variant="n"
              />
            </>
          )}
        </div>

        {!loading && !error && data && (
          <>
            <SignupsChart series={data.signups14d ?? []} t={t} />
            <div className="biz-grid">
              <Breakdown title={t('Users by role')} rows={roleRows} t={t} />
              <Breakdown title={t('Users by status')} rows={statusRows} t={t} />
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}

import AdminShell from '../../components/admin/AdminShell.jsx'
import MetricCard from '../../components/admin/MetricCard.jsx'
import useMetrics from '../../hooks/useMetrics.js'
import { useT } from '../../i18n/index.jsx'

function fmtUptime(sec) {
  if (sec == null) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtMem(usedMb, totalMb) {
  if (usedMb == null || totalMb == null) return '—'
  const pct = totalMb ? Math.round((usedMb / totalMb) * 100) : 0
  return `${pct}%`
}

function SkelMetric() {
  return (
    <div className="metric-card mc-n" style={{ gap: 8 }}>
      <div className="skel" style={{ height: 9, width: 70 }} />
      <div className="skel" style={{ height: 24, width: 60 }} />
      <div className="skel" style={{ height: 9, width: 50 }} />
    </div>
  )
}

function ServiceCard({ name, icon, svc, t }) {
  const ok = svc?.ok
  return (
    <div className={`svc-card ${ok ? 'svc-ok' : 'svc-down'}`}>
      <div className="svc-top">
        <span className="svc-ico"><i className={`ti ${icon}`} aria-hidden="true" /></span>
        <span className="svc-name">{name}</span>
        <span className={`svc-badge ${ok ? 'on' : 'off'}`}>
          <span className="svc-dot" aria-hidden="true" />
          {ok ? t('Healthy') : t('Down')}
        </span>
      </div>
      <div className="svc-meta">
        {ok
          ? t('{n} ms latency', { n: svc?.latencyMs ?? 0 })
          : (svc?.error || t('Unreachable'))}
      </div>
    </div>
  )
}

export default function InfraMonitor() {
  const t = useT()
  const { data, loading, error, auto, setAuto, retry } = useMetrics()

  const sys = data?.system
  const proc = data?.process

  return (
    <AdminShell>
      <div className="content-header">
        <div>
          <div className="page-title">{t('Infrastructure')}</div>
          <div className="page-sub" style={error ? { color: 'var(--err)' } : {}}>
            {loading ? t('Loading…')
              : error  ? t('Failed to load')
              : t('Live system snapshot · auto-refreshes every 5s')}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`btn-sm ${auto ? 'pri' : 'sec'}`}
            onClick={() => setAuto((a) => !a)}
            aria-pressed={auto}
          >
            <i className={`ti ${auto ? 'ti-player-pause' : 'ti-player-play'}`} aria-hidden="true" />
            {auto ? t('Pause') : t('Auto')}
          </button>
          <button className="btn-sm sec" onClick={retry} disabled={loading}>
            <i className="ti ti-refresh" aria-hidden="true" /> {t('Refresh')}
          </button>
        </div>
      </div>

      <div className="content-body">
        {error && (
          <div className="admin-error">
            {t('⚠️ Could not load infrastructure metrics. Check server status or your connection.')}
            <span
              style={{ color: 'var(--teal)', cursor: 'pointer', marginLeft: 'auto', fontSize: '10.5px', flexShrink: 0 }}
              onClick={retry}
            >
              {t('Retry ↺')}
            </span>
          </div>
        )}

        {/* Dependency health */}
        <div className="svc-grid" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          <ServiceCard name="PostgreSQL" icon="ti-database" svc={data?.services?.postgres} t={t} />
          <ServiceCard name="Redis" icon="ti-server-bolt" svc={data?.services?.redis} t={t} />
        </div>

        {/* System + process metrics */}
        <div className="metrics-grid" style={error ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
          {loading ? (
            Array.from({ length: 4 }, (_, i) => <SkelMetric key={i} />)
          ) : (
            <>
              <MetricCard
                label={t('System Uptime')}
                icon={<i className="ti ti-clock" />}
                value={fmtUptime(sys?.uptimeSec)}
                delta={t('host machine')}
                variant="ok"
                valueClass="teal"
              />
              <MetricCard
                label={t('Memory Used')}
                icon={<i className="ti ti-device-sd-card" />}
                value={fmtMem(sys?.memory?.usedMb, sys?.memory?.totalMb)}
                delta={t('{used} of {total} MB', {
                  used: sys?.memory?.usedMb ?? 0,
                  total: sys?.memory?.totalMb ?? 0,
                })}
                variant="n"
              />
              <MetricCard
                label={t('CPU Load (1m)')}
                icon={<i className="ti ti-cpu" />}
                value={sys?.loadavg?.[0] ?? '—'}
                delta={t('{n} cores', { n: sys?.cpus ?? 0 })}
                variant="n"
              />
              <MetricCard
                label={t('API Process')}
                icon={<i className="ti ti-brand-nodejs" />}
                value={`${proc?.rssMb ?? 0} MB`}
                delta={t('up {time} · {ver}', {
                  time: fmtUptime(proc?.uptimeSec),
                  ver: sys?.nodeVersion ?? '',
                })}
                variant="n"
              />
            </>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

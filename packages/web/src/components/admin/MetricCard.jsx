export default function MetricCard({ label, icon, value, delta, variant = 'n', valueClass = '' }) {
  return (
    <div className={`metric-card mc-${variant}`}>
      <div className="metric-top">
        <span className="metric-lbl">{label}</span>
        <span className="metric-ico">{icon}</span>
      </div>
      <div className={`metric-val${valueClass ? ` ${valueClass}` : ''}`}>{value}</div>
      <div className="metric-delta">{delta}</div>
    </div>
  )
}

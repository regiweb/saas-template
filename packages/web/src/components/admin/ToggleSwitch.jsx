export default function ToggleSwitch({ checked, onChange, warning = false }) {
  const cls = warning ? 'warning' : checked ? 'on' : 'off'
  return (
    <div
      className={`switch ${cls}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <div className="switch-thumb" />
    </div>
  )
}

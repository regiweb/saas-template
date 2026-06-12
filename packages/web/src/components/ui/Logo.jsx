export function Logo({ size = 'sm' }) {
  return (
    <div className="logo-wrap">
      <div className={`logo-mark logo-mark-${size}`}>⊞</div>
      <span className={`logo-text logo-text-${size}`}>
        EZ<span className="accent">Launch</span>
      </span>
    </div>
  )
}

export function Button({ variant = 'p', loading = false, disabled, children, ...props }) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spin" />}
      {children}
    </button>
  )
}

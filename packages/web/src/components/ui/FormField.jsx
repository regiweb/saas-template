export function FormField({ label, rightLabel, error, hint, children }) {
  return (
    <div className="fg">
      {(label || rightLabel) && (
        <div className="fl">
          <span>{label}</span>
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      )}
      {children}
      {error && <span className="fi-err-msg">{error}</span>}
      {hint && <span className="fi-hint">{hint}</span>}
    </div>
  )
}

import { useId, cloneElement, isValidElement } from 'react'

export function FormField({ label, rightLabel, error, hint, children }) {
  // Wire the label to its control for screen readers: generate an id, attach it
  // to the (single) input child and reference it from <label htmlFor>. Respects
  // an id already set on the child.
  const autoId = useId()
  const fieldId = isValidElement(children) ? (children.props.id ?? autoId) : undefined
  const control = isValidElement(children) && children.props.id == null
    ? cloneElement(children, { id: fieldId })
    : children

  return (
    <div className="fg">
      {(label || rightLabel) && (
        <div className="fl">
          {label ? <label htmlFor={fieldId}>{label}</label> : <span />}
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      )}
      {control}
      {error && <span className="fi-err-msg">{error}</span>}
      {hint && <span className="fi-hint">{hint}</span>}
    </div>
  )
}

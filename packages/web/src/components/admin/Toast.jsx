import { useEffect } from 'react'

export default function Toast({ message, variant = 'ok', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="toast-fixed">
      <div className={`toast-dot ${variant}`} />
      {message}
    </div>
  )
}

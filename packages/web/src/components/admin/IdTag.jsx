import { useState } from 'react'
import { useT } from '../../i18n/index.jsx'

// Copy with a fallback for insecure origins (http staging), where
// navigator.clipboard is unavailable.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * IdTag — compact, copyable entity id. Shows a shortened form
 * (prefix + tail); click copies the full id to the clipboard.
 */
export default function IdTag({ id, className = '' }) {
  const [copied, setCopied] = useState(false)
  const t = useT()
  if (!id) return null

  const short = id.length > 16 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id

  async function onCopy(e) {
    e.stopPropagation()
    if (await copyText(id)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }

  return (
    <button
      type="button"
      className={`id-tag ${className}`}
      onClick={onCopy}
      title={t('Copy ID: {id}', { id })}
      aria-label={t('Copy ID: {id}', { id })}
    >
      <span className="id-tag-text">{copied ? t('Copied') : short}</span>
      <span className="id-tag-ico" aria-hidden="true">{copied ? '✓' : '⧉'}</span>
    </button>
  )
}

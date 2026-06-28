/**
 * Logo — canonical EZ Launch wordmark (EZL-US-021).
 *
 * Single source for the brand across every shell (auth, app, admin),
 * replacing the previous divergent marks (⊞ / ⚡).
 * Wordmark "EZ Launch" (teal "EZ") + a calm blinking caret.
 * The caret animation respects prefers-reduced-motion.
 *
 * Props:
 *   size  — 'sm' (navbars / drawer) | 'md' (auth pages)
 *   badge — optional pill text (e.g. "ADMIN")
 */
import { useMemo } from 'react'

export function Logo({ size = 'sm', badge }) {
  // Pick one of 7 caret blink variations at random per mount, so repeated
  // logos (navbar + page) and successive page loads don't blink identically.
  const blink = useMemo(() => `cb${1 + Math.floor(Math.random() * 7)}`, [])

  return (
    <span className={`logo-wrap logo-${size}`}>
      <span className="logo-text">
        <span className="logo-ez">EZ</span> Launch
        <span className={`logo-caret ${blink}`} aria-hidden="true" />
      </span>
      {badge && <span className="logo-badge">{badge}</span>}
    </span>
  )
}

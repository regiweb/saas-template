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
export function Logo({ size = 'sm', badge }) {
  return (
    <span className={`logo-wrap logo-${size}`}>
      <span className="logo-text">
        <span className="logo-ez">EZ</span> Launch
        <span className="logo-caret" aria-hidden="true" />
      </span>
      {badge && <span className="logo-badge">{badge}</span>}
    </span>
  )
}

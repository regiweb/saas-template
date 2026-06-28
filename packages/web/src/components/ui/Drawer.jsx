/**
 * Drawer — mobile navigation overlay (EZL-US-012).
 *
 * Renders as a left-side overlay panel on mobile (< md).
 * On desktop (>= md) it is never mounted because the hamburger button
 * that opens it is hidden via CSS, so no extra media-query guard is needed.
 *
 * Accessibility:
 *   - role="dialog" / aria-modal on the panel
 *   - Focus trapped inside while open
 *   - Esc key closes
 *   - Body scroll locked while open
 */
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Logo } from './Logo.jsx'
import { LanguageSwitcher } from './LanguageSwitcher.jsx'
import { useT } from '../../i18n/index.jsx'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),' +
  'textarea:not([disabled]),select:not([disabled]),' +
  '[tabindex]:not([tabindex="-1"])'

export default function Drawer({ id, navItems, onClose, onSignOut, user }) {
  const panelRef = useRef(null)
  const t = useT()

  // Lock body scroll + Esc to close
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const el = panelRef.current
    if (!el) return

    const focusables = [...el.querySelectorAll(FOCUSABLE)]
    focusables[0]?.focus()

    const trap = (e) => {
      if (e.key !== 'Tab' || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    el.addEventListener('keydown', trap)
    return () => el.removeEventListener('keydown', trap)
  }, [])

  const initials = user?.email?.[0]?.toUpperCase() ?? '?'
  const name     = user?.email?.split('@')[0] ?? ''

  return (
    <>
      {/* Backdrop */}
      <div
        className="app-drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        id={id}
        ref={panelRef}
        className="app-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('Navigation')}
      >
        {/* Header */}
        <div className="app-drawer-header">
          <Logo size="sm" />
          <button
            className="app-drawer-close"
            onClick={onClose}
            aria-label={t('Close navigation')}
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="app-drawer-user">
          <div className="app-drawer-avatar" aria-hidden="true">{initials}</div>
          <div className="app-drawer-info">
            <div className="app-drawer-name">{name}</div>
            <div className="app-drawer-email">{user?.email ?? ''}</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="app-drawer-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `app-nav-item${isActive ? ' active' : ''}`
              }
              onClick={onClose}
            >
              <i className={`app-nav-icon ${item.icon}`} aria-hidden="true" />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        {/* Footer: language + sign out */}
        <div className="app-drawer-footer">
          <div className="app-drawer-sep" />
          <div className="app-drawer-lang">
            <LanguageSwitcher variant="compact" />
          </div>
          <button className="app-nav-signout" onClick={onSignOut}>
            <i className="app-nav-icon ti ti-logout" aria-hidden="true" />
            <span>{t('Sign out')}</span>
          </button>
        </div>
      </div>
    </>
  )
}

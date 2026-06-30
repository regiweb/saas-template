/**
 * AppLayout — shell for authenticated pages (EZL-US-012).
 *
 * Structure:
 *   app-shell
 *     app-navbar          ← sticky top bar (brand + hamburger on mobile)
 *     app-body
 *       app-sidebar       ← inline sidebar on desktop (>= 768 px)
 *       app-content       ← page content slot (children)
 *   <Drawer />            ← mobile overlay, mounted only when drawerOpen
 *
 * Navigation items are filtered from nav.js by the current user's role.
 */
import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { NAV_ITEMS } from '../../nav.js'
import Drawer from './Drawer.jsx'
import { Logo } from './Logo.jsx'
import { LanguageSwitcher } from './LanguageSwitcher.jsx'
import { NotificationBell } from './NotificationBell.jsx'
import { useT } from '../../i18n/index.jsx'

export default function AppLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const t = useT()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Close drawer if viewport grows to desktop width
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Nav items filtered by current user role
  const navItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="app-shell">

      {/* ── Top navbar ─────────────────────────────────── */}
      <header className="app-navbar">
        <Logo size="sm" />

        <div className="app-navbar-right">
          <LanguageSwitcher variant="compact" />
          <NotificationBell />
          <div className="app-avatar" aria-hidden="true">{initials}</div>

          {/* Hamburger — visible only on mobile via CSS */}
          <button
            className="app-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('Open navigation')}
            aria-expanded={drawerOpen}
            aria-controls="app-nav-drawer"
          >
            <span className="app-hline" />
            <span className="app-hline" />
            <span className="app-hline" />
          </button>
        </div>
      </header>

      <div className="app-body">

        {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
        <aside className="app-sidebar">
          <nav className="app-sidebar-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `app-nav-item${isActive ? ' active' : ''}`
                }
              >
                <i className={`app-nav-icon ${item.icon}`} aria-hidden="true" />
                <span className="app-nav-label">{t(item.label)}</span>
              </NavLink>
            ))}
            <div className="app-nav-sep" />
            <button className="app-nav-signout" onClick={handleSignOut}>
              <i className="app-nav-icon ti ti-logout" aria-hidden="true" />
              <span className="app-nav-label">{t('Sign out')}</span>
            </button>
          </nav>
        </aside>

        {/* ── Page content ─────────────────────────────── */}
        <main className="app-content">
          {children}
        </main>
      </div>

      {/* ── Mobile overlay drawer (< md only) ─────────── */}
      {drawerOpen && (
        <Drawer
          id="app-nav-drawer"
          navItems={navItems}
          onClose={() => setDrawerOpen(false)}
          onSignOut={handleSignOut}
          user={user}
        />
      )}
    </div>
  )
}

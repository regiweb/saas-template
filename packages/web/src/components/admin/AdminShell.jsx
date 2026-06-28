import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { NAV_ITEMS } from '../../nav.js'
import Drawer from '../ui/Drawer.jsx'
import { Logo } from '../ui/Logo.jsx'
import { LanguageSwitcher } from '../ui/LanguageSwitcher.jsx'
import { useT } from '../../i18n/index.jsx'

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? 'A'

  // Single source of nav (nav.js), filtered by current user role
  const navItems = NAV_ITEMS.filter(
    item => !item.roles || item.roles.includes(user?.role)
  )

  return (
    <div className="admin-shell">
      <header className="admin-navbar">
        <Logo size="sm" badge="ADMIN" />
        <div className="nav-right">
          <LanguageSwitcher variant="compact" />
          <button className="nav-icon-btn" aria-label="Notifications"><i className="ti ti-bell" aria-hidden="true" /></button>
          <div className="avatar">{initials}</div>
          <button
            className="hamburger-btn"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <span className="hline" />
            <span className="hline" />
            <span className="hline" />
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={`ni-icon ${item.icon}`} aria-hidden="true" />
                <span className="ni-label">{t(item.label)}</span>
              </NavLink>
            ))}
            <div className="sidebar-sep" />
            <button className="nav-item danger" onClick={handleSignOut}>
              <i className="ni-icon ti ti-logout" aria-hidden="true" />
              <span className="ni-label">{t('Sign out')}</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <button
              className="collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span>{collapsed ? '›' : '‹'}</span>
              <span className="clabel" style={{ fontSize: '10px' }}>Collapse</span>
            </button>
          </div>
        </aside>

        <main className="admin-content">
          {children}
        </main>
      </div>

      {drawerOpen && (
        <Drawer
          id="admin-nav-drawer"
          user={user}
          navItems={navItems}
          onClose={() => setDrawerOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}

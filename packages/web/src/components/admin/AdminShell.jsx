import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import MobileDrawer from './MobileDrawer.jsx'

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/admin',           end: true },
  { icon: '👥', label: 'Users',     path: '/admin/users',     end: false },
  { icon: '🖥', label: 'Sessions',  path: '/admin/sessions',  end: false },
  { icon: '⚙️', label: 'Settings',  path: '/admin/settings',  end: false },
]

export default function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? 'A'

  return (
    <div className="admin-shell">
      <header className="admin-navbar">
        <div className="nav-logo">
          <div className="nav-mark">⚡</div>
          <div className="nav-text">EZ<span>Launch</span></div>
          <span className="nav-badge">ADMIN</span>
        </div>
        <div className="nav-right">
          <button className="nav-icon-btn" aria-label="Notifications">🔔</button>
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
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="ni-icon">{item.icon}</span>
                <span className="ni-label">{item.label}</span>
              </NavLink>
            ))}
            <div className="sidebar-sep" />
            <button className="nav-item danger" onClick={handleSignOut}>
              <span className="ni-icon">↩</span>
              <span className="ni-label">Sign out</span>
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
        <MobileDrawer
          user={user}
          navItems={NAV_ITEMS}
          onClose={() => setDrawerOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}

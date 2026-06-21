import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

export default function MobileDrawer({ user, navItems, onClose, onSignOut }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const initials = user?.email?.[0]?.toUpperCase() ?? 'A'
  const name     = user?.email?.split('@')[0] ?? 'Admin'

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="nav-logo">
            <div className="nav-mark">⚡</div>
            <div className="nav-text" style={{ fontSize: '11px' }}>EZ<span>Launch</span></div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="drawer-user">
          <div className="drawer-avatar">{initials}</div>
          <div className="drawer-name">{name}</div>
          <div className="drawer-email">{user?.email ?? ''}</div>
        </div>

        <div className="drawer-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `drawer-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="di-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="drawer-sep" />
        </div>

        <button className="drawer-signout" onClick={onSignOut}>
          <span className="di-icon">↩</span>
          <span style={{ color: 'var(--err)' }}>Sign out</span>
        </button>
      </div>
    </>
  )
}

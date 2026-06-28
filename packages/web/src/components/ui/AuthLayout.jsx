import { Logo } from './Logo.jsx'
import { LanguageSwitcher } from './LanguageSwitcher.jsx'

export function AuthPage({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-screen">{children}</div>
    </div>
  )
}

export function AuthNavbar() {
  return (
    <div className="auth-navbar">
      <Logo size="sm" />
      <LanguageSwitcher variant="compact" />
    </div>
  )
}

export function AuthBody({ children }) {
  return <div className="auth-body">{children}</div>
}

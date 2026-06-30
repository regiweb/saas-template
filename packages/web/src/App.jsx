import { AuthProvider } from './hooks/useAuth.jsx'
import { NotificationsProvider } from './hooks/useNotificationCount.jsx'
import Router from './router.jsx'

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <Router />
      </NotificationsProvider>
    </AuthProvider>
  )
}

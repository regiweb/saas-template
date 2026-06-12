import { AuthProvider } from './hooks/useAuth.jsx'
import Router from './router.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}

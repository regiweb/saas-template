import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Welcome() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setLoading(true)
    await signOut()
    navigate('/login')
  }

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
          <div className="space-y-3">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-indigo-600">{initials}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Welcome!</h2>
              <p className="text-sm text-gray-500 mt-1 break-all">{user?.email}</p>
            </div>
            <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
              {user?.role}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 text-left">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Account</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">ID</span>
                  <span className="text-gray-700 font-mono text-xs truncate ml-2 max-w-[160px]">
                    {user?.id}
                  </span>
                </div>
                {user?.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Joined</span>
                    <span className="text-gray-700 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

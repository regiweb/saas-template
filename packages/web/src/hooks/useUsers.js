import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import * as api from '../api/admin.js'

const PER_PAGE = 20

export default function useUsers() {
  const { accessToken } = useAuth()
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1 })

  const load = useCallback(async (f) => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getUsers(accessToken, { ...f, perPage: PER_PAGE })
      setUsers(res.users)
      setTotal(res.total)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => { load(filters) }, [filters, load]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilters(patch) {
    setFilters(f => ({ ...f, ...patch, page: 1 }))
  }

  function setPage(page) {
    setFilters(f => ({ ...f, page }))
  }

  async function blockUser(id)           { await api.blockUser(accessToken, id);           load(filters) }
  async function unblockUser(id)         { await api.unblockUser(accessToken, id);         load(filters) }
  async function changeRole(id, role)    { await api.changeRole(accessToken, id, role);    load(filters) }
  async function resetPassword(id)       { return api.resetPassword(accessToken, id) }
  async function deleteUser(id)          { await api.deleteUser(accessToken, id);          load(filters) }
  async function inviteUser(email, role) { await api.inviteUser(accessToken, email, role); load(filters) }

  /**
   * Patch a single user's role in the local list without triggering a
   * full reload.  Use for optimistic updates — call again with the
   * original role to roll back on API error.
   */
  function optimisticSetRole(id, role) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return {
    users, total, totalPages, loading, error,
    filters, updateFilters, setPage,
    blockUser, unblockUser, changeRole, resetPassword, deleteUser, inviteUser,
    optimisticSetRole,
    reload: () => load(filters),
  }
}

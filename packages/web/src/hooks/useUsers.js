import { useState, useEffect, useCallback } from 'react'
import * as api from '../api/adminMock.js'

const PER_PAGE = 20

export default function useUsers() {
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1 })

  const load = useCallback(async (f = filters) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getUsers({ ...f, perPage: PER_PAGE })
      setUsers(res.users)
      setTotal(res.total)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load(filters) }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilters(patch) {
    setFilters(f => ({ ...f, ...patch, page: 1 }))
  }

  function setPage(page) {
    setFilters(f => ({ ...f, page }))
  }

  async function blockUser(id)       { await api.blockUser(id);       load(filters) }
  async function unblockUser(id)     { await api.unblockUser(id);     load(filters) }
  async function changeRole(id, role){ await api.changeRole(id, role); load(filters) }
  async function resetPassword(id)   { const res = await api.resetPassword(id); return res }
  async function deleteUser(id)      { await api.deleteUser(id); load(filters) }
  async function inviteUser(email, role) { await api.inviteUser(email, role); load(filters) }

  const totalPages = Math.ceil(total / PER_PAGE)

  return {
    users, total, totalPages, loading, error,
    filters, updateFilters, setPage,
    blockUser, unblockUser, changeRole, resetPassword, deleteUser, inviteUser,
    reload: () => load(filters),
  }
}

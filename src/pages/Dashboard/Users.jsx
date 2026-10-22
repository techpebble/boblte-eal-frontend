import React, { useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LuKeyRound, LuPencil, LuPlus, LuSearch } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import UserForm from '../../components/Admin/UserForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { UserContext } from '../../context/userContext'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'

const COLUMN_COUNT = 6

const headerCell =
  'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-3 text-[13px] text-[#2A2F36]'

const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const isActive = (user) => user.isActive !== false

const Users = () => {
  const { user: me } = useContext(UserContext)

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [passwordFor, setPasswordFor] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const fetchUsers = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.USER.GET_DATA, {
        params: { isActive: 'all' }
      })
      setUsers(data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load the users.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [, roleRes, companyRes] = await Promise.all([
          fetchUsers(),
          axiosInstance.get(API_PATHS.ROLE.GET_DATA),
          axiosInstance.get(API_PATHS.COMPANY.GET_DATA)
        ])
        setRoles(roleRes.data?.data || [])
        setCompanies(companyRes.data?.data || [])
      } catch (err) {
        console.error('Could not load the roles or companies.', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = async (values) => {
    try {
      setSaving(true)
      if (editing) {
        await axiosInstance.put(`${API_PATHS.USER.UPDATE_DATA}/${editing._id}`, values)
        toast.success('User updated')
      } else {
        await axiosInstance.post(API_PATHS.USER.ADD_DATA, values)
        toast.success('User added')
      }
      setFormOpen(false)
      setEditing(null)
      await fetchUsers()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the user')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (target) => {
    const next = !isActive(target)
    // Optimistic, then put back if the server refuses — it guards the last
    // person who can manage roles, and your own account.
    setUsers((previous) => previous.map((u) => (u._id === target._id ? { ...u, isActive: next } : u)))
    try {
      await axiosInstance.put(`${API_PATHS.USER.UPDATE_DATA}/${target._id}/status`, { isActive: next })
      toast.success(`${target.fullName} ${next ? 'activated' : 'switched off'}`)
    } catch (err) {
      setUsers((previous) =>
        previous.map((u) => (u._id === target._id ? { ...u, isActive: !next } : u))
      )
      toast.error(err?.response?.data?.message || 'Could not change the account')
    }
  }

  const resetPassword = async () => {
    try {
      setSaving(true)
      await axiosInstance.put(
        `${API_PATHS.USER.UPDATE_DATA}/${passwordFor._id}/password`,
        { password: newPassword }
      )
      toast.success(`Password reset for ${passwordFor.fullName}`)
      setPasswordFor(null)
      setNewPassword('')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reset the password')
    } finally {
      setSaving(false)
    }
  }

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return users.filter((user) => {
      if (statusFilter === 'active' && !isActive(user)) return false
      if (statusFilter === 'inactive' && isActive(user)) return false
      if (roleFilter && user.role?._id !== roleFilter) return false
      if (!needle) return true
      return [user.fullName, user.email, user.mobile]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle))
    })
  }, [users, search, roleFilter, statusFilter])

  const activeCount = users.filter(isActive).length
  const tabs = [
    { key: 'all', label: 'All', count: users.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Switched off', count: users.length - activeCount }
  ]

  return (
    <DashboardLayout activeMenu="Users">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Users</h1>
            <p className="mt-1.5 mb-0 max-w-[620px] text-[13px] text-[#5A636D]">
              Who can sign in, and what each of them is allowed to do. Accounts are
              switched off rather than deleted, because their name stays on everything
              they recorded.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
          >
            <LuPlus />
            Add user
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[11px] border border-[#E3E2DE] bg-white px-3 py-2.5">
          <label className="flex h-[34px] min-w-[200px] flex-[1_1_240px] items-center gap-2.5 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 sm:max-w-[320px]">
            <LuSearch className="shrink-0 text-[#8A919B]" />
            <span className="sr-only">Search users</span>
            <input
              value={search}
              onChange={({ target }) => setSearch(target.value)}
              placeholder="Search name, email or mobile"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
            />
          </label>

          <div role="group" aria-label="Status" className="flex h-[34px] gap-0.5 rounded-lg bg-[#F2F1ED] p-[3px]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={statusFilter === tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`cursor-pointer rounded-md px-3 text-[12.5px] ${
                  statusFilter === tab.key
                    ? 'bg-white font-semibold text-[#15181C] shadow-sm'
                    : 'text-[#4A5159]'
                }`}
              >
                {tab.label}
                <span className="font-numeric ml-1 tabular-nums text-[#8A919B]">{tab.count}</span>
              </button>
            ))}
          </div>

          <label className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#E3E2DE] px-2.5 text-[12.5px]">
            <span className="text-[#5A636D]">Role</span>
            <select
              value={roleFilter}
              onChange={({ target }) => setRoleFilter(target.value)}
              className="cursor-pointer border-0 bg-transparent font-medium text-[#15181C] outline-none"
            >
              <option value="">All</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>{role.name}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
          {!loading && rows.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState
                title="No users match"
                description="Clear the filters to see everyone."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className={headerCell}>Name</th>
                    <th className={headerCell}>Contact</th>
                    <th className={`${headerCell} w-[160px]`}>Role</th>
                    <th className={`${headerCell} w-[180px]`}>Company</th>
                    <th className={`${headerCell} w-[132px]`}>Status</th>
                    <th className={`${headerCell} w-[96px] text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={6} columns={COLUMN_COUNT} />
                  ) : (
                    rows.map((user) => {
                      const live = isActive(user)
                      const isMe = String(user._id) === String(me?._id)
                      return (
                        <tr key={user._id} className="hover:bg-[#FAFAF8]">
                          <td className={bodyCell}>
                            <span className="flex items-center gap-2.5">
                              <span className="font-numeric flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E7F0EC] text-[11px] font-semibold text-[#15594A]">
                                {initialsOf(user.fullName)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-[#15181C]">
                                  {user.fullName}
                                  {isMe && <span className="ml-1.5 text-[11px] font-normal text-[#5A636D]">(you)</span>}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <span className="block truncate" title={user.email}>{user.email}</span>
                            <span className="font-numeric block truncate text-[11.5px] tabular-nums text-[#5A636D]">
                              {user.mobile}
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <span className="truncate">{user.role?.name || '—'}</span>
                          </td>
                          <td className={bodyCell}>
                            <span className="block truncate" title={user.company?.name || undefined}>
                              {user.company?.name || '—'}
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={live}
                              disabled={isMe}
                              onClick={() => toggleStatus(user)}
                              title={isMe ? 'You cannot switch off your own account' : `Click to ${live ? 'switch off' : 'activate'}`}
                              className="inline-flex items-center gap-2 enabled:cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span
                                className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200"
                                style={{ backgroundColor: live ? '#15594A' : '#D7D6D1', opacity: isMe ? 0.5 : 1 }}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                    live ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </span>
                              <span
                                className="rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                                style={live
                                  ? { color: '#15594A', backgroundColor: '#E7F0EC' }
                                  : { color: '#5A636D', backgroundColor: '#F0EFEC' }}
                              >
                                {live ? 'Active' : 'Off'}
                              </span>
                            </button>
                          </td>
                          <td className={`${bodyCell} text-right whitespace-nowrap`}>
                            <button
                              type="button"
                              onClick={() => { setEditing(user); setFormOpen(true) }}
                              aria-label={`Edit ${user.fullName}`}
                              title={`Edit ${user.fullName}`}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED] hover:text-[#15181C]"
                            >
                              <LuPencil />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPasswordFor(user); setNewPassword('') }}
                              aria-label={`Reset password for ${user.fullName}`}
                              title="Reset password"
                              className="ml-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED] hover:text-[#15181C]"
                            >
                              <LuKeyRound />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        title={editing ? 'Edit user' : 'Add user'}
        styleClass="w-full max-w-xl"
      >
        <UserForm
          record={editing}
          roles={roles}
          companies={companies}
          onSubmit={save}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={Boolean(passwordFor)}
        onClose={() => { setPasswordFor(null); setNewPassword('') }}
        title="Reset password"
        styleClass="w-full max-w-md"
      >
        {passwordFor && (
          <div className="font-ui flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
                Reset password for {passwordFor.fullName}
              </h2>
              <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                Their current password stops working at once. Tell them the new one
                yourself, and ask them to change it.
              </p>
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-[#3C434B]">
                New password
              </label>
              <input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={({ target }) => setNewPassword(target.value)}
                placeholder="At least 8 characters"
                className="h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13.5px] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setPasswordFor(null); setNewPassword('') }}
                className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || newPassword.length < 8}
                onClick={resetPassword}
                className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
              >
                {saving ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default Users

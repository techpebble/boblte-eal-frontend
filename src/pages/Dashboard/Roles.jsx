import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LuLock, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import RoleForm from '../../components/Admin/RoleForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { formatQuantity } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'

const COLUMN_COUNT = 5

const headerCell =
  'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-3 text-[13px] text-[#2A2F36]'

const Roles = () => {
  const [roles, setRoles] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removeCandidate, setRemoveCandidate] = useState(null)

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.ROLE.GET_DATA)
      setRoles(data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load the roles.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [, permissionRes] = await Promise.all([
          fetchRoles(),
          axiosInstance.get(API_PATHS.ROLE.GET_PERMISSIONS)
        ])
        setCatalogue(permissionRes.data?.data || [])
      } catch (err) {
        console.error('Could not load the permission list.', err)
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
        await axiosInstance.put(`${API_PATHS.ROLE.UPDATE_DATA}/${editing._id}`, values)
        toast.success('Role updated')
      } else {
        await axiosInstance.post(API_PATHS.ROLE.ADD_DATA, values)
        toast.success('Role created')
      }
      setFormOpen(false)
      setEditing(null)
      await fetchRoles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the role')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      setSaving(true)
      await axiosInstance.delete(`${API_PATHS.ROLE.DELETE_DATA}/${removeCandidate._id}`)
      toast.success('Role removed')
      setRemoveCandidate(null)
      await fetchRoles()
    } catch (err) {
      // The API refuses a role people still hold, and says how many.
      toast.error(err?.response?.data?.message || 'Could not remove the role')
    } finally {
      setSaving(false)
    }
  }

  const totalPermissions = catalogue.reduce((sum, group) => sum + group.permissions.length, 0)

  return (
    <DashboardLayout activeMenu="Roles">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Roles</h1>
            <p className="mt-1.5 mb-0 max-w-[620px] text-[13px] text-[#5A636D]">
              What each kind of account is allowed to do. Changing a role takes effect
              on the next request everyone holding it makes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
          >
            <LuPlus />
            Add role
          </button>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
          {!loading && roles.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState title="No roles yet" description="Add the first role to get started." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className={headerCell}>Role</th>
                    <th className={headerCell}>Description</th>
                    <th className={`${headerCell} w-[150px]`}>Permissions</th>
                    <th className={`${headerCell} w-[100px] text-right`}>People</th>
                    <th className={`${headerCell} w-[96px] text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={4} columns={COLUMN_COUNT} />
                  ) : (
                    roles.map((role) => (
                      <tr key={role._id} className="hover:bg-[#FAFAF8]">
                        <td className={`${bodyCell} font-medium text-[#15181C]`}>
                          <span className="flex items-center gap-2">
                            <span className="truncate">{role.name}</span>
                            {role.isSystem && (
                              <span
                                title="Built in. Always holds every permission, and cannot be changed or removed."
                                className="inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-[#E7F0EC] px-1.5 py-px text-[10.5px] font-semibold text-[#15594A]"
                              >
                                <LuLock className="text-[10px]" />
                                Built in
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={bodyCell}>
                          <span className="block truncate text-[#5A636D]" title={role.description || undefined}>
                            {role.description || '—'}
                          </span>
                        </td>
                        <td className={`${bodyCell} font-numeric tabular-nums`}>
                          {role.isSystem
                            ? `All ${formatQuantity(totalPermissions || role.permissions.length)}`
                            : `${formatQuantity(role.permissions.length)} of ${formatQuantity(totalPermissions)}`}
                        </td>
                        <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                          {formatQuantity(role.userCount)}
                        </td>
                        <td className={`${bodyCell} text-right whitespace-nowrap`}>
                          <button
                            type="button"
                            disabled={role.isSystem}
                            onClick={() => { setEditing(role); setFormOpen(true) }}
                            aria-label={`Edit ${role.name}`}
                            title={role.isSystem ? 'Built in — cannot be changed' : `Edit ${role.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A636D] enabled:cursor-pointer enabled:hover:bg-[#F2F1ED] enabled:hover:text-[#15181C] disabled:cursor-not-allowed disabled:text-[#D7D6D1]"
                          >
                            <LuPencil />
                          </button>
                          <button
                            type="button"
                            disabled={role.isSystem || role.userCount > 0}
                            onClick={() => setRemoveCandidate(role)}
                            aria-label={`Remove ${role.name}`}
                            title={
                              role.isSystem
                                ? 'Built in — cannot be removed'
                                : role.userCount > 0
                                  ? `${role.userCount} ${role.userCount === 1 ? 'person holds' : 'people hold'} this role`
                                  : `Remove ${role.name}`
                            }
                            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A636D] enabled:cursor-pointer enabled:hover:bg-[#FCEBEA] enabled:hover:text-[#9B2C2C] disabled:cursor-not-allowed disabled:text-[#D7D6D1]"
                          >
                            <LuTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))
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
        title={editing ? 'Edit role' : 'Add role'}
        styleClass="w-full max-w-2xl"
      >
        <RoleForm record={editing} catalogue={catalogue} onSubmit={save} loading={saving} />
      </Modal>

      <Modal
        isOpen={Boolean(removeCandidate)}
        onClose={() => setRemoveCandidate(null)}
        title="Remove role"
        styleClass="w-full max-w-lg"
      >
        {removeCandidate && (
          <div className="font-ui flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
                Remove {removeCandidate.name}?
              </h2>
              <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                Nobody holds this role, so removing it changes nothing for anyone. It
                cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRemoveCandidate(null)}
                className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={remove}
                className="h-9 cursor-pointer rounded-lg border border-[#9B2C2C] bg-[#9B2C2C] px-3.5 text-[13px] font-semibold text-white hover:bg-[#872626] disabled:opacity-60"
              >
                {saving ? 'Removing…' : 'Remove role'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default Roles

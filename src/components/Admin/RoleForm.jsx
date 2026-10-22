import React, { useEffect, useMemo, useState } from 'react'
import Input from '../inputs/Input'
import FormSection from '../inputs/FormSection'
import { formatQuantity } from '../Dashboard/dashboardFormat'

const blank = { name: '', description: '', permissions: [] }

/**
 * A role is a name and a set of permissions, so the permissions are the form.
 * They arrive from the server already grouped, which keeps the groups here
 * and the ones the API defines from drifting apart.
 */
const RoleForm = ({ record, catalogue = [], onSubmit, loading }) => {
  const [values, setValues] = useState(blank)

  useEffect(() => {
    setValues(record
      ? {
        name: record.name ?? '',
        description: record.description ?? '',
        permissions: [...(record.permissions ?? [])]
      }
      : blank)
  }, [record])

  const allKeys = useMemo(
    () => catalogue.flatMap((group) => group.permissions.map((p) => p.key)),
    [catalogue]
  )

  const toggle = (key) =>
    setValues((previous) => ({
      ...previous,
      permissions: previous.permissions.includes(key)
        ? previous.permissions.filter((k) => k !== key)
        : [...previous.permissions, key]
    }))

  const toggleGroup = (group) => {
    const keys = group.permissions.map((p) => p.key)
    const allOn = keys.every((k) => values.permissions.includes(k))
    setValues((previous) => ({
      ...previous,
      permissions: allOn
        ? previous.permissions.filter((k) => !keys.includes(k))
        : [...new Set([...previous.permissions, ...keys])]
    }))
  }

  const ready = Boolean(values.name.trim())

  return (
    <form
      className="font-ui flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name: values.name.trim(),
          description: values.description.trim(),
          permissions: values.permissions
        })
      }}
    >
      <div>
        <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
          {record ? `Edit ${record.name}` : 'New role'}
        </h2>
        <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
          A role is a set of permissions. Anyone holding it can do exactly what is
          ticked here and nothing else.
        </p>
      </div>

      <FormSection title="Name">
        <div className="grid grid-cols-1 gap-3.5">
          <Input
            label="Role name"
            value={values.name}
            onChange={({ target }) => setValues((p) => ({ ...p, name: target.value }))}
            type="text"
            required
            hint="What people will see against their account, for example Depot Clerk."
          />
          <Input
            label="Description"
            value={values.description}
            onChange={({ target }) => setValues((p) => ({ ...p, description: target.value }))}
            type="text"
            hint="Optional. A line saying who this is for."
          />
        </div>
      </FormSection>

      <FormSection
        title={`Permissions · ${formatQuantity(values.permissions.length)} of ${formatQuantity(allKeys.length)}`}
      >
        <div className="flex flex-col gap-3">
          {catalogue.map((group) => {
            const keys = group.permissions.map((p) => p.key)
            const on = keys.filter((k) => values.permissions.includes(k)).length
            return (
              <div key={group.name} className="overflow-hidden rounded-[10px] border border-[#E3E2DE]">
                <div className="flex items-center justify-between gap-3 border-b border-[#EDECE8] bg-[#FAFAF8] px-3.5 py-2.5">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-[#5A636D] uppercase">
                    {group.name}
                    <span className="font-numeric ml-2 tabular-nums text-[#8A919B]">
                      {on}/{keys.length}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="cursor-pointer text-[12px] font-medium text-[#15594A] underline underline-offset-[3px]"
                  >
                    {on === keys.length ? 'Clear group' : 'Select group'}
                  </button>
                </div>
                <div className="flex flex-col">
                  {group.permissions.map((permission) => {
                    const checked = values.permissions.includes(permission.key)
                    return (
                      <label
                        key={permission.key}
                        className="flex cursor-pointer items-start gap-2.5 border-t border-[#F3F2EF] px-3.5 py-2.5 first:border-t-0 hover:bg-[#FAFAF8]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(permission.key)}
                          className="mt-[3px] h-[15px] w-[15px] shrink-0 cursor-pointer accent-[#15594A]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] text-[#15181C]">{permission.label}</span>
                          {permission.note && (
                            <span className="mt-0.5 block text-[11.5px] text-[#5A636D]">{permission.note}</span>
                          )}
                        </span>
                        <span className="font-numeric shrink-0 text-[10.5px] text-[#A8ADB5]">
                          {permission.key}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </FormSection>

      <div className="flex justify-end border-t border-[#EDECE8] pt-4">
        <button
          type="submit"
          disabled={loading || !ready}
          className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          {loading ? 'Saving…' : record ? 'Save changes' : 'Create role'}
        </button>
      </div>
    </form>
  )
}

export default RoleForm

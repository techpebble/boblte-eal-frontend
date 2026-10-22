import React, { useEffect, useState } from 'react'
import Input from '../inputs/Input'
import Select from '../inputs/Select'
import FormSection from '../inputs/FormSection'

const blank = { fullName: '', email: '', mobile: '', role: '', company: '', password: '' }

const fromRecord = (record) => ({
  fullName: record.fullName ?? '',
  email: record.email ?? '',
  mobile: record.mobile ?? '',
  role: record.role?._id ?? record.role ?? '',
  company: record.company?._id ?? record.company ?? '',
  password: ''
})

/**
 * Adding and editing a person. A password is set only when adding — changing
 * someone's password is its own action, so it cannot happen by accident while
 * correcting a phone number.
 */
const UserForm = ({ record, roles = [], companies = [], onSubmit, loading }) => {
  const [values, setValues] = useState(blank)

  useEffect(() => {
    setValues(record ? fromRecord(record) : blank)
  }, [record])

  const change = (name, value) => setValues((previous) => ({ ...previous, [name]: value }))

  const roleOptions = roles.map((role) => ({ value: role._id, label: role.name }))
  const companyOptions = companies.map((company) => ({ value: company._id, label: company.name }))
  const chosenRole = roles.find((role) => role._id === values.role)

  // A person belongs to one company. Working across both is decided by the
  // role, not here: a role holding companies:all sees every company, and the
  // company below is then only where this person's new records are filed.
  const seesEveryCompany = Boolean(
    chosenRole?.isSystem || chosenRole?.permissions?.includes('companies:all')
  )

  const ready = Boolean(
    values.fullName.trim() &&
    values.email.trim() &&
    values.mobile.trim() &&
    values.role &&
    values.company &&
    (record || values.password.length >= 8)
  )

  return (
    <form
      className="font-ui flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        const payload = {
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          mobile: values.mobile.trim(),
          role: values.role,
          company: values.company
        }
        if (!record) payload.password = values.password
        onSubmit(payload)
      }}
    >
      <div>
        <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
          {record ? `Edit ${record.fullName}` : 'Add a user'}
        </h2>
        <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
          Everything this person records is stamped with their name, so each one
          needs their own account.
        </p>
      </div>

      <FormSection title="Person">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input
            label="Full name"
            value={values.fullName}
            onChange={({ target }) => change('fullName', target.value)}
            type="text"
            required
          />
          <Input
            label="Mobile"
            value={values.mobile}
            onChange={({ target }) => change('mobile', target.value)}
            type="text"
            required
            mono
            hint="Can be used to sign in, as well as the email."
          />
        </div>
        <div className="mt-3.5">
          <Input
            label="Email"
            value={values.email}
            onChange={({ target }) => change('email', target.value)}
            type="text"
            required
          />
        </div>
      </FormSection>

      <FormSection title="Access">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Select
            label="Role"
            placeholder="Select a role"
            value={values.role}
            onChange={({ target }) => change('role', target.value)}
            options={roleOptions}
            hint={chosenRole?.description || undefined}
          />
          <Select
            label="Company"
            placeholder="Select a company"
            value={values.company}
            onChange={({ target }) => change('company', target.value)}
            options={companyOptions}
            hint={
              seesEveryCompany
                ? 'This role sees every company. This one is where their own records are filed.'
                : 'The only company they will see. To let someone work across both, give them a role that holds companies:all.'
            }
          />
        </div>
      </FormSection>

      {!record && (
        <FormSection title="First password">
          <Input
            label="Password"
            value={values.password}
            onChange={({ target }) => change('password', target.value)}
            type="password"
            required
            hint="At least 8 characters. They should change it once they are in."
          />
        </FormSection>
      )}

      <div className="flex justify-end border-t border-[#EDECE8] pt-4">
        <button
          type="submit"
          disabled={loading || !ready}
          className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          {loading ? 'Saving…' : record ? 'Save changes' : 'Add user'}
        </button>
      </div>
    </form>
  )
}

export default UserForm

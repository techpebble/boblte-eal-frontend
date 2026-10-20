import React, { useEffect, useState } from 'react'
import Input from '../inputs/Input'
import Select from '../inputs/Select'
import FormSection from '../inputs/FormSection'

const MARKETS = [
  { value: 'local', label: 'Local' },
  { value: 'export', label: 'Export' }
]

const BLANK = {
  itemCode: '',
  name: '',
  alias: '',
  description: '',
  pack: '',
  market: 'local',
  bottlesPerCase: '',
  brand: '',
  company: '',
  isActive: true
}

const fromRecord = (record) => ({
  itemCode: record.itemCode ?? '',
  name: record.name ?? '',
  alias: record.alias ?? '',
  description: record.description ?? '',
  pack: record.pack?._id ?? record.pack ?? '',
  market: record.market ?? 'local',
  bottlesPerCase: record.bottlesPerCase ?? '',
  brand: record.brand ?? '',
  company: record.company?._id ?? record.company ?? '',
  isActive: record.isActive !== false
})

/**
 * One form for adding and editing an item. Editing fills it from the record
 * and adds the status switch; adding starts blank.
 */
const ItemForm = ({ record, onSubmit, loading, companies = [], packs = [] }) => {
  const [formData, setFormData] = useState(() => (record ? fromRecord(record) : BLANK))

  useEffect(() => {
    setFormData(record ? fromRecord(record) : BLANK)
  }, [record])

  const companyOptions = companies.map((company) => ({ value: company._id, label: company.name }))
  const packOptions = packs.map((pack) => ({ value: pack._id, label: pack.name }))

  const change = (name, value) => {
    setFormData((previous) => {
      const next = { ...previous, [name]: value }
      // A pack carries its own bottles-per-case, so choosing one fills the
      // figure in rather than leaving it to be retyped and mistyped.
      if (name === 'pack') {
        const selectedPack = packs.find((p) => p._id === value)
        if (selectedPack) next.bottlesPerCase = selectedPack.bottlesPerCase
      }
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(formData)
  }

  const ready = Boolean(
    formData.itemCode.trim() &&
    formData.name.trim() &&
    formData.brand.trim() &&
    formData.description.trim() &&
    formData.company &&
    formData.pack &&
    Number(formData.bottlesPerCase) > 0
  )

  return (
    <form onSubmit={handleSubmit} className="font-ui flex flex-col gap-5">
      <div>
        <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
          {record ? 'Edit item' : 'Add item'}
        </h2>
        <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
          A product that labels are applied to.
        </p>
      </div>

      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Input
            label="Item code"
            value={formData.itemCode}
            onChange={({ target }) => change('itemCode', target.value)}
            type="text"
            required
            mono
            hint="Must be unique."
          />
          <Input
            label="Brand"
            value={formData.brand}
            onChange={({ target }) => change('brand', target.value)}
            type="text"
            required
          />
        </div>
        <div className="mt-3.5">
          <Input
            label="Name"
            value={formData.name}
            onChange={({ target }) => change('name', target.value)}
            type="text"
            required
          />
        </div>
        <div className="mt-3.5">
          <Input
            label="Short name"
            value={formData.alias}
            onChange={({ target }) => change('alias', target.value)}
            type="text"
            hint="Optional. Shown instead of the full name in tables and pickers."
          />
        </div>
        <div className="mt-3.5">
          <label htmlFor="item-description" className="mb-1.5 block text-xs font-medium text-[#3C434B]">
            Description
          </label>
          <textarea
            id="item-description"
            rows={2}
            value={formData.description}
            onChange={({ target }) => change('description', target.value)}
            required
            className="w-full resize-y rounded-lg border border-[#D7D6D1] bg-white px-[11px] py-2.5 text-[13.5px] text-[#15181C] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]"
          />
        </div>
      </FormSection>

      <FormSection title="Classification">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Select
            label="Company"
            placeholder="Select a Company"
            value={formData.company}
            onChange={({ target }) => change('company', target.value)}
            options={companyOptions}
          />
          <Select
            label="Market"
            placeholder="Select a Market"
            value={formData.market}
            onChange={({ target }) => change('market', target.value)}
            options={MARKETS}
          />
          <Select
            label="Pack"
            placeholder="Select a Pack"
            value={formData.pack}
            onChange={({ target }) => change('pack', target.value)}
            options={packOptions}
            hint="Choosing a pack fills in bottles per case."
          />
          <Input
            label="Bottles per case"
            value={formData.bottlesPerCase}
            onChange={({ target }) => change('bottlesPerCase', target.value)}
            type="text"
            mono
            hint="Drives every case figure in the app."
          />
        </div>
      </FormSection>

      {record && (
        <FormSection title="Status">
          <button
            type="button"
            role="switch"
            aria-checked={formData.isActive}
            onClick={() => change('isActive', !formData.isActive)}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <span
              className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200"
              style={{ backgroundColor: formData.isActive ? '#15594A' : '#D7D6D1' }}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  formData.isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
            <span className="text-[13px] text-[#2A2F36]">
              {formData.isActive
                ? 'Active — offered when recording usage and dispatch'
                : 'Inactive — kept on past records, no longer offered'}
            </span>
          </button>
        </FormSection>
      )}

      <div className="flex justify-end border-t border-[#EDECE8] pt-4">
        <button
          type="submit"
          disabled={loading || !ready}
          className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          {loading ? 'Saving…' : record ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </form>
  )
}

export default ItemForm

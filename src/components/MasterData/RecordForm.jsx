import React, { useEffect, useState } from 'react'

const fieldClass =
  'h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13.5px] text-[#15181C] outline-none placeholder:text-[#A8ADB5] focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

const blank = (fields) =>
  fields.reduce((values, field) => ({ ...values, [field.name]: '' }), {})

const fromRecord = (fields, record) =>
  fields.reduce(
    (values, field) => ({ ...values, [field.name]: record?.[field.name] ?? '' }),
    {}
  )

/**
 * One form for every master-data record. `fields` describes what to collect;
 * a `record` switches it from adding to editing.
 */
const RecordForm = ({ fields, record, onSubmit, loading, submitLabel }) => {
  const [values, setValues] = useState(() =>
    record ? fromRecord(fields, record) : blank(fields)
  )

  // The modal keeps this mounted between rows, so follow whichever is open.
  useEffect(() => {
    setValues(record ? fromRecord(fields, record) : blank(fields))
  }, [record, fields])

  const change = (name, value) => setValues((previous) => ({ ...previous, [name]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = fields.reduce((result, field) => {
      const raw = values[field.name]
      return {
        ...result,
        [field.name]: field.type === 'number' ? Number(raw) : String(raw).trim()
      }
    }, {})
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="font-ui flex flex-col gap-3.5">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="mb-1.5 block text-xs font-medium text-[#3C434B]">
            {field.label} <span className="text-[#9B2C2C]">*</span>
          </label>
          {field.multiline ? (
            <textarea
              id={field.name}
              rows={2}
              required
              value={values[field.name]}
              onChange={({ target }) => change(field.name, target.value)}
              placeholder={field.placeholder}
              className={`${fieldClass} h-auto resize-y py-2.5`}
            />
          ) : (
            <input
              id={field.name}
              type={field.type === 'number' ? 'number' : 'text'}
              required
              min={field.type === 'number' ? 1 : undefined}
              value={values[field.name]}
              onChange={({ target }) => change(field.name, target.value)}
              placeholder={field.placeholder}
              className={`${fieldClass} ${field.type === 'number' ? 'font-numeric tabular-nums' : ''}`}
            />
          )}
          {field.hint && <p className="mt-1.5 mb-0 text-[11px] text-[#5A636D]">{field.hint}</p>}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-10 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] text-[13.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

export default RecordForm

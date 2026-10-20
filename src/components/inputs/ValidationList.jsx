import React from 'react'
import { LuX } from 'react-icons/lu'
import { CheckIcon } from '../Dashboard/icons'

/**
 * The rules the API will apply, shown while the fields are being filled in
 * rather than reported back as a rejection afterwards.
 */
const ValidationList = ({ checks, className = '' }) => (
  <ul className={`m-0 flex list-none flex-col gap-[7px] p-0 ${className}`}>
    {checks.map((check) => (
      <li
        key={check.text}
        className="flex items-start gap-2 text-xs"
        style={{ color: check.ok ? '#15594A' : '#5A636D' }}
      >
        <span className="mt-px shrink-0">
          {check.ok ? <CheckIcon size={14} strokeWidth={2.4} /> : <LuX className="text-[#A8ADB5]" />}
        </span>
        {check.text}
      </li>
    ))}
  </ul>
)

export default ValidationList

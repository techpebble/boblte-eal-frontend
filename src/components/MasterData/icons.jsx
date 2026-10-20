import React from 'react'

// Stroke icons for the master-data empty states, matching the weight of the
// set in components/Dashboard/icons.
const Icon = ({ size = 20, strokeWidth = 1.7, d, label }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={label ? undefined : 'true'}
    role={label ? 'img' : undefined}
    aria-label={label}
  >
    <path d={d} />
  </svg>
)

export const PackageIcon = (props) => (
  <Icon {...props} d="M4 7h16v13H4zM4 7l2-4h12l2 4M10 12h4" />
)

export const WarehouseIcon = (props) => (
  <Icon {...props} d="M3 20V9l9-5 9 5v11M9 20v-6h6v6" />
)

export const BuildingIcon = (props) => (
  <Icon {...props} d="M4 20V4h10v16M14 10h6v10M7 8h2m-2 4h2m-2 4h2" />
)

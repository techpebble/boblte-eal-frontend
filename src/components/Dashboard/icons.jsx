import React from 'react';

// Stroke pictograms taken from the design canvas so the page matches the
// artboard rather than approximating it with a general-purpose icon set.
const Icon = ({ d, size = 16, strokeWidth = 1.7, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={d} />
  </svg>
);

export const TagIcon = (props) => <Icon {...props} d="M3 11V4h7l10 10-7 7L3 11ZM7.5 7.5h.01" />;
export const InboxIcon = (props) => (
  <Icon {...props} d="M12 3v9m0 0 3.5-3.5M12 12 8.5 8.5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
);
export const ChartIcon = (props) => <Icon {...props} d="M3 20h18M4 20V11l5 3V11l5 3V7l5 3v10" />;
export const TruckIcon = (props) => (
  <Icon {...props} d="M3 6h11v10H3zM14 9h4l3 3v4h-7zM7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
);
export const AlertIcon = (props) => (
  <Icon {...props} d="M12 8v5m0 3h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
);
export const CalendarIcon = (props) => <Icon {...props} d="M5 5h14v15H5zM5 9h14M9 3v4M15 3v4" />;
export const CheckIcon = (props) => <Icon {...props} d="m4 13 5 5L20 7" />;
export const RefreshIcon = (props) => (
  <Icon {...props} d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
);

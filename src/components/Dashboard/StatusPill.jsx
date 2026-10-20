import React from 'react';
import { statusStyle } from './dashboardFormat';

const StatusPill = ({ status }) => {
  const { label, fg, bg } = statusStyle(status);
  return (
    <span
      className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap"
      style={{ color: fg, backgroundColor: bg }}
    >
      {label}
    </span>
  );
};

export default StatusPill;

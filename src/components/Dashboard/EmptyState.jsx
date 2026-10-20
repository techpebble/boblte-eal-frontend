import React from 'react';
import { TagIcon } from './icons';

// Replaces the old bare "No data available" row, per the Foundations artboard.
const EmptyState = ({ icon, title, description, action, className = '' }) => (
  <div
    className={`rounded-[10px] border border-dashed border-[#D7D6D1] bg-[#FAFAF8] px-5 py-[26px] text-center ${className}`}
  >
    <span className="inline-flex text-[#A8ADB5]">{icon || <TagIcon size={26} strokeWidth={1.5} />}</span>
    <p className="mt-[11px] mb-[3px] text-[13.5px] font-semibold text-[#15181C]">{title}</p>
    {description && <p className="m-0 text-xs text-[#5A636D]">{description}</p>}
    {action && <div className="mt-[14px] flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;

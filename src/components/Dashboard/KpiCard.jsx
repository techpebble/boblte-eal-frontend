import React from 'react';
import { formatQuantity, unitLabel } from './dashboardFormat';

/**
 * The API reports changePct as null when the earlier figure was zero, because
 * the change is undefined rather than nil — that renders as a dash.
 */
const deltaChip = (changePct) => {
  if (changePct == null) return { text: '—', fg: '#5A636D', bg: '#F0EFEC' };
  if (changePct > 0) return { text: `+${changePct}%`, fg: '#15594A', bg: '#E7F0EC' };
  if (changePct < 0) return { text: `−${Math.abs(changePct)}%`, fg: '#8A5A00', bg: '#FBF1DC' };
  return { text: '0%', fg: '#5A636D', bg: '#F0EFEC' };
};

const KpiCard = ({ label, icon, kpi, footnote }) => {
  const chip = deltaChip(kpi?.changePct);

  return (
    <div className="flex flex-col gap-[10px] rounded-xl border border-[#E3E2DE] bg-white px-4 pt-4 pb-[14px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
          {label}
        </span>
        <span className="text-[#A8ADB5]">{icon}</span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-numeric text-[29px] leading-none font-medium tracking-[-0.02em] tabular-nums">
          {formatQuantity(kpi?.value ?? 0)}
        </span>
        <span className="text-xs text-[#5A636D]">{unitLabel(kpi?.unit)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="font-numeric rounded-[5px] px-1.5 py-[2px] text-[11.5px] font-medium tabular-nums"
          style={{ color: chip.fg, backgroundColor: chip.bg }}
          title={`Previous period: ${formatQuantity(kpi?.previous ?? 0)} ${unitLabel(kpi?.unit)}`}
        >
          {chip.text}
        </span>
        <span className="text-[11.5px] text-[#5A636D]">{footnote}</span>
      </div>
    </div>
  );
};

export default KpiCard;

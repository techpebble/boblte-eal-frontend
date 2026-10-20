import React from 'react';

// Loading placeholders per the Foundations artboard: rows hold the page's
// shape while the figures arrive, instead of a full-screen overlay.
const BAR_WIDTHS = [
  ['96px', '62px'],
  ['78px', '88px'],
  ['104px', '54px'],
  ['86px', '72px'],
];

export const SkeletonBar = ({ width, tone = 'strong', className = '' }) => (
  <span
    className={`block h-[11px] rounded ${tone === 'strong' ? 'bg-[#EFEEEA]' : 'bg-[#F4F3F0]'} ${className}`}
    style={width ? { width } : undefined}
  />
);

export const SkeletonLines = ({ rows = 4, className = '' }) => (
  <div className={`flex animate-pulse flex-col gap-[11px] ${className}`} aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => {
      const [a, b] = BAR_WIDTHS[index % BAR_WIDTHS.length];
      return (
        <div key={index} className="flex items-center gap-3">
          <SkeletonBar width={a} />
          <SkeletonBar width={b} tone="soft" />
          <SkeletonBar className="flex-1" />
        </div>
      );
    })}
  </div>
);

export const SkeletonTableRows = ({ rows = 6, columns = 7 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex} className="animate-pulse">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <td key={columnIndex} className="border-t border-[#EDECE8] px-4 py-[14px]">
            <SkeletonBar
              width={BAR_WIDTHS[(rowIndex + columnIndex) % BAR_WIDTHS.length][columnIndex % 2]}
              tone={columnIndex % 2 ? 'soft' : 'strong'}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const SkeletonKpiCard = () => (
  <div className="animate-pulse rounded-xl border border-[#E3E2DE] bg-white p-4">
    <SkeletonBar width="88px" tone="soft" />
    <div className="mt-4 h-[29px] w-[128px] rounded bg-[#EFEEEA]" />
    <div className="mt-3 flex items-center gap-2">
      <SkeletonBar width="52px" tone="soft" />
      <SkeletonBar width="76px" />
    </div>
  </div>
);

import React from 'react';
import SerialRange from './SerialRange';
import StatusPill from './StatusPill';
import EmptyState from './EmptyState';
import { SkeletonTableRows } from './Skeleton';
import { InboxIcon } from './icons';
import { MOVEMENT_TABS, formatMovementDate, formatQuantity, statusStyle } from './dashboardFormat';

const COLUMNS = 7;

const headerCell = 'px-4 pt-[11px] pb-[10px] text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap text-left';
const bodyCell = 'border-t border-[#EDECE8] px-4 py-[13px] text-[13px] text-[#2A2F36] align-middle';

const RecentMovement = ({ rows, loading, activeTab, onTabChange }) => (
  <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDECE8] px-[18px] pt-4 pb-[14px]">
      <div>
        <h2 className="m-0 text-[14.5px] font-semibold tracking-[-0.01em]">Recent label movement</h2>
        <p className="mt-[3px] mb-0 text-xs text-[#5A636D]">
          Every issuance, usage and dispatch link in this period, newest first
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter label movement">
        {MOVEMENT_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => onTabChange(tab.key)}
              className={`h-[30px] cursor-pointer rounded-[7px] border px-[11px] text-xs ${
                active
                  ? 'border-[#15181C] bg-[#15181C] font-medium text-white'
                  : 'border-[#D7D6D1] bg-white text-[#2A2F36] hover:bg-[#FAFAF8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>

    {!loading && rows.length === 0 ? (
      <div className="px-[18px] py-5">
        <EmptyState
          icon={<InboxIcon size={26} strokeWidth={1.5} />}
          title="No movement in this period"
          description="Nothing has been issued, applied or linked under this filter. Widen the period, or pick another filter."
        />
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="bg-[#FAFAF8]">
              <th className={headerCell}>When</th>
              <th className={headerCell}>Event</th>
              <th className={headerCell}>Company</th>
              <th className={headerCell}>Pack / item</th>
              <th className={headerCell}>Serial range</th>
              <th className={`${headerCell} text-right`}>Labels</th>
              <th className={headerCell}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={6} columns={COLUMNS} />
            ) : (
              rows.map((row, index) => (
                <tr
                  key={`${row.type}-${row.prefix}-${row.serialFrom}-${row.at}-${index}`}
                  className="hover:bg-[#FAFAF8]"
                >
                  <td className={`${bodyCell} whitespace-nowrap text-[#5A636D]`} title={row.recordedAt ? `Recorded ${new Date(row.recordedAt).toLocaleString('en-IN')}` : undefined}>
                    {formatMovementDate(row.at)}
                  </td>
                  <td className={bodyCell}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 flex-none rounded-full"
                        style={{ backgroundColor: statusStyle(row.status).fg }}
                      />
                      <span className="font-medium whitespace-nowrap text-[#15181C]">{row.event}</span>
                    </span>
                  </td>
                  <td className={bodyCell}>
                    <span className="block max-w-[180px] truncate" title={row.company || undefined}>
                      {row.company || '—'}
                    </span>
                  </td>
                  <td className={bodyCell}>
                    <span className="block max-w-[220px]">
                      <span className="block truncate text-[#15181C]">
                        {row.pack?.name || '—'}
                        {row.market && <span className="text-[#8A919B] capitalize"> · {row.market}</span>}
                      </span>
                      {/* Item names run long — "… 90ML TETRAPAK x 96" — so they
                          are clipped rather than widening the table. */}
                      {row.item && (
                        <span className="block truncate text-[11.5px] text-[#5A636D]" title={row.item}>
                          {row.item}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={bodyCell}>
                    <SerialRange
                      prefix={row.prefix}
                      serialFrom={row.serialFrom}
                      serialTo={row.serialTo}
                    />
                  </td>
                  <td className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}>
                    {formatQuantity(row.quantity)}
                  </td>
                  <td className={bodyCell}>
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )}

    {(loading || rows.length > 0) && (
      <div className="border-t border-[#EDECE8] bg-[#FAFAF8] px-[18px] py-3 text-xs text-[#5A636D]">
        {loading
          ? 'Loading movement…'
          : `Showing the ${rows.length} most recent ${rows.length === 1 ? 'movement' : 'movements'} in this period`}
      </div>
    )}
  </section>
);

export default RecentMovement;

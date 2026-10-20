import React from 'react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import { SkeletonLines } from './Skeleton';
import { EXPORT_AMBER, SEAL, formatQuantity } from './dashboardFormat';

const barFill = (market) => (market === 'export' ? EXPORT_AMBER : SEAL);

const StockByPack = ({ rows, loading }) => (
  <section className="min-w-0 flex-[999_1_520px] rounded-xl border border-[#E3E2DE] bg-white">
    <div className="flex items-center justify-between gap-3 border-b border-[#EDECE8] px-[18px] pt-4 pb-[14px]">
      <div>
        <h2 className="m-0 text-[14.5px] font-semibold tracking-[-0.01em]">
          EAL stock on hand, by pack
        </h2>
        <p className="mt-[3px] mb-0 text-xs text-[#5A636D]">
          Unused labels still held against each issuance
        </p>
      </div>
      <Link to="/eal-stock" className="text-[12.5px] font-medium text-[#15594A]">
        Open stock
      </Link>
    </div>

    <div className="flex flex-col gap-[13px] px-[18px] pt-[14px] pb-4">
      {loading ? (
        <SkeletonLines rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No EAL stock on hand"
          description="Every issued range has been fully applied, or no issuance has been recorded yet."
        />
      ) : (
        <>
          {rows.map((row) => (
            <div key={`${row.pack?.id}-${row.market}`} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-medium text-[#15181C]">
                  {row.pack?.name || 'Unnamed pack'}
                  <span className="text-[#8A919B] capitalize"> · {row.market}</span>
                </span>
                <span className="flex flex-none items-baseline gap-2">
                  <span className="font-numeric text-[13px] font-medium tabular-nums">
                    {formatQuantity(row.labels)}
                  </span>
                  <span className="min-w-[62px] text-right text-[11px] text-[#5A636D]">
                    {row.cases == null ? '—' : `${formatQuantity(row.cases)} cases`}
                  </span>
                </span>
              </div>
              <div className="h-[7px] overflow-hidden rounded bg-[#EFEEEA]">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(row.sharePct || 0, 1.5)}%`,
                    backgroundColor: barFill(row.market),
                  }}
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 pt-1 text-[11.5px] text-[#5A636D]">
            <span className="flex items-center gap-1.5">
              <span className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: SEAL }} />
              Local market
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-[9px] w-[9px] rounded-[2px]"
                style={{ backgroundColor: EXPORT_AMBER }}
              />
              Export market
            </span>
          </div>
        </>
      )}
    </div>
  </section>
);

export default StockByPack;

import React from 'react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState';
import { SkeletonLines } from './Skeleton';
import { CheckIcon } from './icons';
import { formatQuantity, shortReference } from './dashboardFormat';

const AwaitingLinking = ({ notes, loading }) => (
  <section className="min-w-0 flex-[1_1_330px] rounded-xl border border-[#E3E2DE] bg-white">
    <div className="border-b border-[#EDECE8] px-[18px] pt-4 pb-[14px]">
      <h2 className="m-0 text-[14.5px] font-semibold tracking-[-0.01em]">Awaiting EAL linking</h2>
      <p className="mt-[3px] mb-0 text-xs text-[#5A636D]">Open dispatch notes, oldest first</p>
    </div>

    {loading ? (
      <div className="px-[18px] py-4">
        <SkeletonLines rows={3} />
      </div>
    ) : notes.length === 0 ? (
      <div className="px-[18px] py-4">
        <EmptyState
          icon={<CheckIcon size={26} strokeWidth={1.5} />}
          title="Every note is fully linked"
          description="No open dispatch note is short of a serial range."
        />
      </div>
    ) : (
      <ul className="m-0 list-none py-1 pl-0">
        {notes.map((note) => (
          <li key={note.id} className="border-b border-[#F3F2EF] last:border-b-0">
            <Link
              to="/dispatch"
              className="flex items-center gap-3 px-[18px] py-[13px] text-inherit"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {/* The Dispatch model has no reference field yet, so the note's
                    id stands in — see shortReference(). */}
                <span className="font-numeric text-[12.5px] font-medium text-[#15181C] tabular-nums">
                  {shortReference(note.id)}
                </span>
                <span className="truncate text-[11.5px] text-[#5A636D]">
                  {[note.depot, note.company].filter(Boolean).join(' · ') || 'Depot not set'}
                </span>
              </span>
              <span className="flex flex-none flex-col items-end gap-[3px]">
                <span className="font-numeric text-xs text-[#15181C] tabular-nums">
                  {formatQuantity(note.linkedCases)} / {formatQuantity(note.cases)}
                </span>
                <span className="rounded-[5px] bg-[#FBF1DC] px-1.5 py-[1px] text-[10.5px] font-semibold text-[#8A5A00]">
                  {note.ageDays}d
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}

    <div className="px-[18px] py-3">
      <Link
        to="/dispatch"
        className="block rounded-lg border border-[#D7D6D1] p-2 text-center text-[12.5px] font-medium text-[#2A2F36]"
      >
        View all dispatches
      </Link>
    </div>
  </section>
);

export default AwaitingLinking;

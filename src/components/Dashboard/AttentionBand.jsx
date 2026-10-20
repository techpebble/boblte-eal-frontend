import React from 'react';
import { Link } from 'react-router-dom';
import { AlertIcon } from './icons';
import { formatQuantity } from './dashboardFormat';

// Only shown while dispatch notes are short of serial ranges.
const AttentionBand = ({ count, casesOutstanding }) => {
  if (!count) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#EBD9AC] bg-[#FBF1DC] px-4 py-3">
      <span className="flex-none text-[#8A5A00]">
        <AlertIcon size={17} strokeWidth={1.9} />
      </span>
      <span className="min-w-[220px] flex-1 text-[13px] text-[#5C3D06]">
        <strong className="font-semibold text-[#3F2A04]">
          {count} {count === 1 ? 'dispatch is' : 'dispatches are'} awaiting EAL linking.
        </strong>{' '}
        {formatQuantity(casesOutstanding)} {casesOutstanding === 1 ? 'case' : 'cases'} still need a
        serial range before the note can leave draft.
      </span>
      <Link
        to="/dispatch"
        className="border-b border-[#D4B978] text-[12.5px] font-semibold text-[#6B4705]"
      >
        Review dispatches
      </Link>
    </div>
  );
};

export default AttentionBand;

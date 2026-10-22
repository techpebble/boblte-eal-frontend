import React, { useState } from 'react';
import Modal from './Modal';
import { LuCalendar } from 'react-icons/lu';
import { DateRangePicker } from 'react-date-range';
import { formatDate } from '../../utils/helper';

/**
 * The range in as few characters as it can be said without ambiguity: the
 * year only when it is not this one, the month only once when both ends
 * share it. For a 320px rail, "1 Oct 2026 – 23 Oct 2026" is most of a row
 * spent on something the picker shows in full anyway.
 */
const shortRange = (start, end) => {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf())) return '—';

  const thisYear = new Date().getFullYear();
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  const month = (date) => date.toLocaleDateString('en-IN', { month: 'short' });
  const tail = sameYear && to.getFullYear() === thisYear ? '' : ` ${to.getFullYear()}`;

  if (sameMonth) return `${from.getDate()}–${to.getDate()} ${month(to)}${tail}`;
  return `${from.getDate()} ${month(from)} – ${to.getDate()} ${month(to)}${tail}`;
};

const DateRangeModal = ({
  dateRange,
  onApplyDateRange, // Passes final selected range to parent
  compact = false // Fills its container and says the range in short form
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalDateRange, setModalDateRange] = useState(dateRange);

  const handleModalDateChange = (ranges) => {
    setModalDateRange(ranges.selection);
  };

  const onApply = () => {
    onApplyDateRange(modalDateRange);
    setIsOpen(false);
  };

  return (
    <div className={compact ? 'min-w-0 flex-[1.25_1_0]' : undefined}>
      {/* Calendar toggle button */}
      <button
        type="button"
        className={
          compact
            ? 'flex h-[30px] w-full cursor-pointer items-center gap-1 rounded-lg border border-[#E3E2DE] bg-white px-1.5 text-[11px] text-[#15181C] hover:bg-[#FAFAF8]'
            : 'flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 text-[12.5px] text-[#15181C] hover:bg-[#F2F1ED]'
        }
        onClick={() => setIsOpen(true)}
      >
        <LuCalendar className="shrink-0 text-[#5A636D]" />
        {compact ? (
          <span className="font-numeric min-w-0 flex-1 truncate text-left tabular-nums">
            {shortRange(dateRange?.startDate, dateRange?.endDate)}
          </span>
        ) : (
          <span className="font-numeric tabular-nums">{formatDate(dateRange?.startDate) + ' – ' + formatDate(dateRange?.endDate)}</span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Select Date"
        >
          <div className="space-y-4">
            <DateRangePicker
              ranges={[modalDateRange]}
              onChange={handleModalDateChange}
            />
            <div className="flex justify-between mt-4">
              <span></span>
              <button
                type="button"
                className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F]"
                onClick={onApply}
              >
                Apply
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DateRangeModal;

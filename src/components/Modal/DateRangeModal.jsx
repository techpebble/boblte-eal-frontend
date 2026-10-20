import React, { useState } from 'react';
import Modal from './Modal';
import { LuCalendar } from 'react-icons/lu';
import { DateRangePicker } from 'react-date-range';
import { formatDate } from '../../utils/helper';

const DateRangeModal = ({
  dateRange,
  onApplyDateRange // Passes final selected range to parent
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
    <div>
      {/* Calendar toggle button */}
      <button
        type="button"
        className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 text-[12.5px] text-[#15181C] hover:bg-[#F2F1ED]"
        onClick={() => setIsOpen(true)}
      >
        <LuCalendar className="text-[#5A636D]" />
        <span className="font-numeric tabular-nums">{formatDate(dateRange?.startDate) + ' – ' + formatDate(dateRange?.endDate)}</span>
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

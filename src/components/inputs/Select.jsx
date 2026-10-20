import React from 'react';
import ReactSelect from 'react-select';
import { selectStyles } from './selectStyles';

const Select = ({ value, onChange, label, options = [], placeholder, disabled, searchable, hint }) => {
  // Find the selected option object
  const selectedOption = options.find((opt) => opt.value === value) || null;
  const id = label ? `select-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#3C434B]">
          {label}
        </label>
      )}
      <ReactSelect
        inputId={id}
        value={selectedOption}
        onChange={(selected) => {
          // Create a mock event object for compatibility with onChange({ target: { value } })
          onChange({ target: { value: selected ? selected.value : '' } });
        }}
        options={options}
        placeholder={placeholder}
        isSearchable={searchable}
        isDisabled={Boolean(disabled)}
        styles={selectStyles}
      />
      {hint && <p className="mt-1.5 mb-0 text-[11px] text-[#5A636D]">{hint}</p>}
    </div>
  );
};

export default Select;

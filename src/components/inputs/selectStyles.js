const INK = '#15181C';
const MUTED = '#5A636D';
const RULE = '#D7D6D1';
const SEAL = '#15594A';

/**
 * react-select styled to match the plain inputs beside it, so a form does not
 * read as two different control sets. Lives apart from the component so the
 * inline item pickers can share it.
 */
export const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    backgroundColor: state.isDisabled ? '#F2F1ED' : '#FFFFFF',
    borderColor: state.isFocused ? SEAL : RULE,
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 0 3px #E7F0EC' : 'none',
    fontSize: '13.5px',
    ':hover': { borderColor: state.isFocused ? SEAL : RULE }
  }),
  valueContainer: (base) => ({ ...base, padding: '0 10px' }),
  placeholder: (base) => ({ ...base, color: '#A8ADB5' }),
  singleValue: (base) => ({ ...base, color: INK }),
  input: (base) => ({ ...base, color: INK, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: '#8A919B', padding: '0 8px' }),
  menu: (base) => ({
    ...base,
    zIndex: 100,
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #E3E2DE',
    boxShadow: '0 8px 24px rgba(21, 24, 28, 0.08)'
  }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    borderRadius: '6px',
    fontSize: '13px',
    color: state.isSelected ? '#FFFFFF' : INK,
    backgroundColor: state.isSelected ? SEAL : state.isFocused ? '#F3F8F6' : 'transparent',
    ':active': { backgroundColor: state.isSelected ? SEAL : '#E7F0EC' }
  }),
  noOptionsMessage: (base) => ({ ...base, fontSize: '12.5px', color: MUTED })
};

export default selectStyles;

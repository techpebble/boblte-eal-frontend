import { addThousandsSeparator } from '../../utils/helper';

// The redesigned dashboard's palette, kept in one place so every panel on the
// page agrees. Mirrors the Foundations artboard of the design canvas.
export const INK = '#15181C';
export const INK_MUTED = '#5A636D';
export const INK_FAINT = '#8A919B';
export const RULE = '#E3E2DE';
export const RULE_SOFT = '#EDECE8';
export const PAPER = '#F6F5F3';
export const SEAL = '#15594A';
export const EXPORT_AMBER = '#C07A1E';

// The feed's filters map onto the endpoint's `types` parameter, so switching a
// tab refetches rather than hiding rows the server never sent.
export const MOVEMENT_TABS = [
  { key: 'all', label: 'All', types: null },
  { key: 'issuance', label: 'Issuance', types: 'issuance' },
  { key: 'usage', label: 'Usage', types: 'usage' },
  { key: 'dispatch', label: 'Dispatch', types: 'dispatch-link' },
];

export const STATUS_STYLES = {
  posted: { label: 'Posted', fg: '#15594A', bg: '#E7F0EC' },
  linked: { label: 'Linked', fg: '#1D4E89', bg: '#E8EFF8' },
  final: { label: 'Final', fg: '#1D4E89', bg: '#E8EFF8' },
  draft: { label: 'Draft', fg: '#8A5A00', bg: '#FBF1DC' },
  voided: { label: 'Voided', fg: '#9B2C2C', bg: '#FCEBEA' },
  exhausted: { label: 'Exhausted', fg: '#5A636D', bg: '#F0EFEC' },
  // Issuance rows carry no status field; these are worked out from how much of
  // the range is left.
  unused: { label: 'Unused', fg: '#1D4E89', bg: '#E8EFF8' },
  'in-use': { label: 'In use', fg: '#15594A', bg: '#E7F0EC' },
  // Usage rows likewise: worked out from how many of the cases produced have
  // since been linked to a dispatch.
  // Dispatch note statuses, in the order a note moves through them.
  loaded: { label: 'Loaded', fg: '#1D4E89', bg: '#E8EFF8' },
  delivered: { label: 'Delivered', fg: '#15594A', bg: '#E7F0EC' },
  'in-stock': { label: 'In stock', fg: '#15594A', bg: '#E7F0EC' },
  'part-dispatched': { label: 'Part dispatched', fg: '#8A5A00', bg: '#FBF1DC' },
  dispatched: { label: 'Dispatched', fg: '#1D4E89', bg: '#E8EFF8' },
};

export const MARKET_STYLES = {
  local: { label: 'Local', fg: '#15594A', bg: '#E7F0EC' },
  export: { label: 'Export', fg: '#7A3E12', bg: '#F7EADC' },
};

export const marketStyle = (market) =>
  MARKET_STYLES[String(market || '').toLowerCase()] || {
    label: market ? String(market) : '—',
    fg: INK_MUTED,
    bg: '#F0EFEC',
  };

export const statusStyle = (status) =>
  STATUS_STYLES[String(status || '').toLowerCase()] || {
    label: status ? String(status) : '—',
    fg: INK_MUTED,
    bg: '#F0EFEC',
  };

/**
 * Whole numbers stay whole; the case counts the API derives by division keep
 * up to two decimals rather than being rounded into a wrong reconciliation.
 */
export const formatQuantity = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const rounded = Math.round(num * 100) / 100;
  return addThousandsSeparator(Number.isInteger(rounded) ? rounded : rounded.toFixed(2));
};

// The unit the API reports, in the wording the artboard uses.
export const unitLabel = (unit) => (unit === 'labels' ? 'EAL' : unit || '');

/**
 * What to call an item on screen. Item names run to things like "ORIGINAL
 * CHOICE DELUXE WHISKY 90ML TETRAPAK x 96", so a short alias is shown in its
 * place wherever one has been set.
 */
export const itemLabel = (item) => item?.alias?.trim() || item?.name || null;

/** Serials always render as ten digits so ranges line up column to column. */
export const padSerial = (serial) => String(serial ?? '').padStart(10, '0');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1–20 Oct 2026", collapsing the month and year when both ends share them. */
export const formatPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  // One day is a day, not a span from itself to itself.
  if (sameMonth && start.getDate() === end.getDate()) {
    return `${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }

  const left = sameMonth
    ? `${start.getDate()}`
    : `${start.getDate()} ${MONTHS[start.getMonth()]}${sameYear ? '' : ` ${start.getFullYear()}`}`;

  return `${left}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Movement dates are business dates rather than timestamps, so the feed shows
 * the day rather than a misleading 00:00.
 */
export const formatMovementDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Dispatch notes have no human-readable reference yet — the Dispatch model
 * carries only its ObjectId — so the last six characters stand in. Swap this
 * for the real note number once a reference field exists on the model.
 */
export const shortReference = (id) => {
  const value = String(id ?? '');
  return value ? `#${value.slice(-6).toUpperCase()}` : '—';
};

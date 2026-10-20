import React from 'react';
import { padSerial } from './dashboardFormat';

/**
 * The three-letter prefix stays muted so the eye lands on the ten digits that
 * actually differ between one range and the next.
 */
const Serial = ({ prefix, serial }) => (
  <span className="font-numeric text-xs tabular-nums">
    {prefix && <span className="text-[#8A919B]">{prefix}</span>}
    <span className="text-[#15181C]">{padSerial(serial)}</span>
  </span>
);

const SerialRange = ({ prefix, serialFrom, serialTo }) => {
  if (serialFrom == null && serialTo == null) return <span className="text-[#8A919B]">—</span>;

  return (
    <span className="whitespace-nowrap">
      <Serial prefix={prefix} serial={serialFrom} />
      <span className="px-[3px] text-[#C3C2BD]">→</span>
      <Serial prefix={prefix} serial={serialTo} />
    </span>
  );
};

export default SerialRange;

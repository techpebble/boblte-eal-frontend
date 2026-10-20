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

/**
 * `compact` prints the prefix once instead of on both ends. Both serials in a
 * range always share it, so repeating it costs about 45px of table width and
 * says nothing.
 */
const SerialRange = ({ prefix, serialFrom, serialTo, compact }) => {
  if (serialFrom == null && serialTo == null) return <span className="text-[#8A919B]">—</span>;

  if (compact) {
    return (
      <span className="font-numeric text-xs whitespace-nowrap tabular-nums">
        {prefix && <span className="text-[#8A919B]">{prefix} </span>}
        <span className="text-[#15181C]">{padSerial(serialFrom)}</span>
        <span className="px-[3px] text-[#C3C2BD]">→</span>
        <span className="text-[#15181C]">{padSerial(serialTo)}</span>
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap">
      <Serial prefix={prefix} serial={serialFrom} />
      <span className="px-[3px] text-[#C3C2BD]">→</span>
      <Serial prefix={prefix} serial={serialTo} />
    </span>
  );
};

export default SerialRange;

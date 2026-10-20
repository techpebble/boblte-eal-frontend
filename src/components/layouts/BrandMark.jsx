import React from 'react'

/** The seal-green lockup used in the sidebar and in the top bar on a phone. */
const BrandMark = () => (
  <span className="flex items-center gap-2.5">
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#15594A]">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6.5h16v11H4zM8 6.5v11M16 6.5v11" />
      </svg>
    </span>
    <span className="flex flex-col leading-[1.15]">
      <span className="text-sm font-semibold tracking-[-0.01em]">TrackEAL</span>
      <span className="text-[10.5px] font-medium tracking-[0.09em] text-[#5A636D] uppercase">
        BOBLTE Excise
      </span>
    </span>
  </span>
)

export default BrandMark

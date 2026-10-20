import React from 'react'
import { LuBell, LuMenu, LuSearch } from 'react-icons/lu'
import { groupNameFor } from '../../utils/data'
import BrandMark from './BrandMark'

const Navbar = ({ activeMenu, onOpenSideMenu }) => {
  const group = groupNameFor(activeMenu)

  return (
    // py-[11px] + a 34px tall row + the 1px border = 57px, which is the offset
    // the sidebar sticks to in DashboardLayout. Keep the two in step.
    <header className="font-ui sticky top-0 z-30 flex flex-wrap items-center gap-3.5 border-b border-[#E3E2DE] bg-white/90 px-4 py-[11px] backdrop-blur-sm sm:px-7">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenSideMenu}
        className="-ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#15181C] hover:bg-[#F2F1ED] min-[1081px]:hidden"
      >
        <LuMenu className="text-xl" />
      </button>

      {/* The sidebar carries the lockup on a wide screen; on a phone it is hidden. */}
      <span className="min-[1081px]:hidden">
        <BrandMark />
      </span>

      <div className="hidden items-center gap-[7px] text-[12.5px] text-[#5A636D] min-[1081px]:flex">
        {group && (
          <>
            <span>{group}</span>
            <span className="text-[#C3C2BD]">/</span>
          </>
        )}
        <span className="font-medium text-[#15181C]">{activeMenu}</span>
      </div>

      <label className="hidden h-[34px] min-w-[200px] flex-1 items-center gap-2.5 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 sm:flex sm:max-w-[420px]">
        <LuSearch className="shrink-0 text-[#8A919B]" />
        <span className="sr-only">Search EAL serial, dispatch or item</span>
        <input
          type="search"
          placeholder="Jump to EAL serial, dispatch or item"
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
        />
      </label>

      <span className="flex-1 sm:hidden" />

      <button
        type="button"
        aria-label="Notifications"
        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-[#E3E2DE] bg-white text-[#5A636D] hover:bg-[#FAFAF8]"
      >
        <LuBell />
      </button>
    </header>
  )
}

export default Navbar

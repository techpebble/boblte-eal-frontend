import React, { useEffect, useRef, useState } from 'react'
import { LuBell, LuMenu, LuSearch } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { groupNameFor } from '../../utils/data'
import BrandMark from './BrandMark'

const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '')

const Navbar = ({ activeMenu, onOpenSideMenu }) => {
  const group = groupNameFor(activeMenu)
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const [term, setTerm] = useState('')

  // The hint in the box has to mean something, so the shortcut puts the
  // cursor here from anywhere that is not already a field.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key?.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // There is no search endpoint spanning everything, so this does the one
  // thing it honestly can: hand the serial to Find EAL, which traces it.
  const onSubmit = (event) => {
    event.preventDefault()
    const serial = term.trim()
    if (!serial) return
    navigate(`/find-eal?serial=${encodeURIComponent(serial)}`)
    searchRef.current?.blur()
  }

  return (
    // Sticks to the top of the content column, beside the menu rather than
    // over it.
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

      <form
        onSubmit={onSubmit}
        className="hidden h-[34px] min-w-[200px] flex-1 items-center gap-2.5 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 focus-within:border-[#15594A] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#E7F0EC] sm:flex sm:max-w-[420px]"
      >
        <LuSearch className="shrink-0 text-[#8A919B]" />
        <label htmlFor="global-search" className="sr-only">
          Jump to an EAL serial
        </label>
        <input
          id="global-search"
          ref={searchRef}
          type="search"
          value={term}
          onChange={({ target }) => setTerm(target.value)}
          placeholder="Jump to an EAL serial"
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
        />
        <kbd className="font-numeric shrink-0 rounded border border-[#E3E2DE] bg-white px-[5px] py-[2px] text-[10px] text-[#5A636D]">
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      </form>

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

import React, { useContext, useEffect, useRef, useState } from 'react'
import { LuChevronsUpDown, LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { SIDE_MENU_GROUPS } from '../../utils/data'
import { visibleGroups } from '../../utils/permissions'
import { UserContext } from '../../context/userContext'
import BrandMark from './BrandMark'

/**
 * A role used to be a string on the user and is now a record, so this takes
 * either. Rendering the object itself is what React refuses, and it takes the
 * whole page down with it rather than just this line.
 */
const roleName = (role) => {
  if (!role) return ''
  return typeof role === 'string' ? role : role.name || ''
}

/** "Ravi Nanayakkara" -> "RN", so the avatar works without an uploaded photo. */
const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const SideMenu = ({ activeMenu, onNavigate }) => {
  const { user, clearUser } = useContext(UserContext)
  const navigate = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)

  // The account menu should go away on a click anywhere else, or on Escape.
  useEffect(() => {
    if (!accountOpen) return undefined

    const onPointer = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  const go = (path) => {
    navigate(path)
    // On a phone the menu sits in a drawer, which should close behind you.
    if (onNavigate) onNavigate()
  }

  const handleLogout = () => {
    localStorage.clear()
    clearUser()
    navigate('/login')
  }

  return (
    <nav
      aria-label="Main"
      className="font-ui flex h-full w-[260px] flex-col gap-4 border-r border-[#E3E2DE] bg-white px-3 pt-[18px] pb-3.5"
    >
      <div className="px-2 pb-2.5">
        <BrandMark />
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleGroups(SIDE_MENU_GROUPS, user).map((group) => (
          <div key={group.id} className="flex flex-col gap-px">
            <div className="px-2.5 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.1em] text-[#8A919B] uppercase">
              {group.name}
            </div>
            {group.items.map((item) => {
              const active = activeMenu === item.label
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => go(item.path)}
                  className={`flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 text-left text-[13px] ${
                    active
                      ? 'bg-[#15594A] font-semibold text-white'
                      : 'text-[#3C434B] hover:bg-[#F2F1ED]'
                  }`}
                >
                  <item.icon className={`shrink-0 text-base ${active ? '' : 'opacity-75'}`} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div ref={accountRef} className="relative border-t border-[#EDECE8] pt-2.5">
        {/* One row for the account, with the chevron standing for the menu it
            opens. Signing out lives in there rather than sitting in the
            sidebar beside the pages. */}
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left ${
            accountOpen ? 'bg-[#F2F1ED]' : 'hover:bg-[#F2F1ED]'
          }`}
        >
          <span className="font-numeric flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E7F0EC] text-[11px] font-semibold text-[#15594A]">
            {initialsOf(user?.fullName)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
            <span className="truncate text-[12.5px] font-medium">{user?.fullName || '—'}</span>
            <span className="truncate text-[10.5px] text-[#5A636D]">{roleName(user?.role)}</span>
          </span>
          <LuChevronsUpDown className="shrink-0 text-sm text-[#8A919B]" />
        </button>

        {accountOpen && (
          <div
            role="menu"
            className="absolute right-0 bottom-[calc(100%+6px)] left-0 overflow-hidden rounded-[10px] border border-[#E3E2DE] bg-white py-1 shadow-[0_8px_24px_rgba(21,24,28,0.10)]"
          >
            <div className="border-b border-[#F3F2EF] px-3 py-2">
              <p className="m-0 truncate text-[11.5px] text-[#5A636D]">{user?.email || ''}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#3C434B] hover:bg-[#FCEBEA] hover:text-[#9B2C2C]"
            >
              <LuLogOut className="shrink-0 text-base opacity-75" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default SideMenu

import React, { useContext } from 'react'
import { LuLogOut } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { SIDE_MENU_GROUPS } from '../../utils/data'
import { UserContext } from '../../context/userContext'
import BrandMark from './BrandMark'

/** "Ravi Nanayakkara" -> "RN", so the avatar works without an uploaded photo. */
const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const SideMenu = ({ activeMenu, onNavigate }) => {
  const { user, clearUser } = useContext(UserContext)
  const navigate = useNavigate()

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
        {SIDE_MENU_GROUPS.map((group) => (
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

      <div className="border-t border-[#EDECE8] pt-2.5">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="font-numeric flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E7F0EC] text-[11px] font-semibold text-[#15594A]">
            {initialsOf(user?.fullName)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[12.5px] font-medium">{user?.fullName || '—'}</span>
            <span className="truncate text-[10.5px] text-[#5A636D] capitalize">
              {user?.role || ''}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 text-left text-[13px] text-[#3C434B] hover:bg-[#FCEBEA] hover:text-[#9B2C2C]"
        >
          <LuLogOut className="shrink-0 text-base opacity-75" />
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default SideMenu

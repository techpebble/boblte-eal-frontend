import React, { useEffect, useState } from 'react'
import { LuX } from 'react-icons/lu'
import Navbar from './Navbar'
import SideMenu from './SideMenu'

const DashboardLayout = ({ children, activeMenu }) => {
    // The drawer lives here rather than in the Navbar, so the button in the bar
    // and the menu it opens are not owned by two different components.
    const [drawerOpen, setDrawerOpen] = useState(false)

    // A drawer left open while the window grows would sit over the fixed
    // sidebar, so close it once the layout is wide enough to show both.
    useEffect(() => {
        const wide = window.matchMedia('(min-width: 1081px)')
        const close = (event) => { if (event.matches) setDrawerOpen(false) }
        wide.addEventListener('change', close)
        return () => wide.removeEventListener('change', close)
    }, [])

    return (
        <div className="font-ui min-h-screen bg-[#F6F5F3] text-[#15181C]">
            <Navbar activeMenu={activeMenu} onOpenSideMenu={() => setDrawerOpen(true)} />

            <div className="flex items-start">
                <div className="sticky top-[57px] h-[calc(100vh-57px)] shrink-0 max-[1080px]:hidden">
                    <SideMenu activeMenu={activeMenu} />
                </div>

                {/* min-w-0 keeps this column from being widened by a page's widest
                    table — without it the content grows past the viewport and
                    body's overflow-x:hidden clips it, so it cannot be scrolled. */}
                <main className="min-w-0 grow px-4 py-5 sm:px-7">{children}</main>
            </div>

            {drawerOpen && (
                <div className="fixed inset-0 z-40 min-[1081px]:hidden">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setDrawerOpen(false)}
                        className="absolute inset-0 h-full w-full cursor-default bg-black/30"
                    />
                    <div className="absolute inset-y-0 left-0 flex">
                        <SideMenu activeMenu={activeMenu} onNavigate={() => setDrawerOpen(false)} />
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() => setDrawerOpen(false)}
                            className="m-2 flex h-9 w-9 cursor-pointer items-center justify-center self-start rounded-lg bg-white text-[#15181C]"
                        >
                            <LuX />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DashboardLayout

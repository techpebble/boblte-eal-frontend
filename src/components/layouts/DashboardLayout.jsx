import React, { useContext } from 'react'
import { UserContext } from '../../context/userContext'
import Navbar from './Navbar'
import SideMenu from './SideMenu'

const DashboardLayout = ({ children, activeMenu }) => {
    const { user } = useContext(UserContext);
    return (
        <div className="'">
            <Navbar activeMenu={activeMenu} />
            
            {user && (
                <div className="flex">
                    <div className="max-[1080px]:hidden">
                        <SideMenu activeMenu={activeMenu} />
                    </div>
                    {/* min-w-0 keeps this flex item from being widened by a page's
                        widest table — without it the content column grows past
                        the viewport and body's overflow-x:hidden clips it. */}
                    <div className="grow min-w-0 mx-2">{children}</div>
                </div>
            )}
        </div>
    )
}

export default DashboardLayout
import { LuLayoutDashboard, LuFactory, LuBuilding, LuLogOut, LuTruck, LuTags, LuScanSearch, LuShoppingCart } from "react-icons/lu";

export const SIDE_MENU_DATA = [
    {
        id: "01",
        label: "Dashboard",
        icon: LuLayoutDashboard,
        path: "/dashboard"
    },
    {
        id: "02",
        label: "EAL Issuance",
        icon: LuBuilding,
        path: "/eal-issuance"
    },
    {
        id: "03",
        label: "EAL Stock",
        icon: LuTags,
        path: "/eal-stock"
    },
    {
        id: "04",
        label: "EAL Usage",
        icon: LuFactory,
        path: "/eal-usage"
    },
    {
        id: "05",
        label: "Finished Stock",
        icon: LuShoppingCart,
        path: "/finished-stock"
    },
    {
        id: "06",
        label: "Dispatch",
        icon: LuTruck,
        path: "/dispatch"
    },
    {
        id: "07",
        label: "Find EAL",
        icon: LuScanSearch,
        path: "/find-eal"
    },
    {
        id: "08",
        label: "Items",
        icon: LuScanSearch,
        path: "/items"
    },
    {
        id: "09",
        label: "Packs",
        icon: LuScanSearch,
        path: "/packs"
    },
    {
        id: "10",
        label: "Delivery Depots",
        icon: LuScanSearch,
        path: "/delivery-depots"
    },
    {
        id: "11",
        label: "Logout",
        icon: LuLogOut,
        path: "/logout"
    }
];
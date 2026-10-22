import {
    LuUsers,
    LuShieldCheck,
    LuLayoutDashboard,
    LuDownload,
    LuFactory,
    LuTruck,
    LuTags,
    LuBoxes,
    LuScanSearch,
    LuWine,
    LuPackage,
    LuWarehouse,
    LuBuilding2
} from "react-icons/lu";

// The menu is grouped so the eleven destinations read as four short lists
// rather than one long one. `label` is what a page passes as `activeMenu`,
// so these strings must match the pages exactly.
export const SIDE_MENU_GROUPS = [
    {
        id: "operations",
        name: "Operations",
        items: [
            { id: "01", label: "Dashboard", permission: "dashboard:view", icon: LuLayoutDashboard, path: "/dashboard" },
            { id: "02", label: "EAL Issuance", permission: "issuance:view", icon: LuDownload, path: "/eal-issuance" },
            { id: "03", label: "EAL Usage", permission: "usage:view", icon: LuFactory, path: "/eal-usage" },
            { id: "04", label: "Dispatch", permission: "dispatch:view", icon: LuTruck, path: "/dispatch" }
        ]
    },
    {
        id: "inventory",
        name: "Inventory",
        items: [
            { id: "05", label: "EAL Stock", permission: "stock:view", icon: LuTags, path: "/eal-stock" },
            { id: "06", label: "Finished Stock", permission: "finished:view", icon: LuBoxes, path: "/finished-stock" }
        ]
    },
    {
        id: "lookup",
        name: "Lookup",
        items: [
            { id: "07", label: "Find EAL", permission: "eal:trace", icon: LuScanSearch, path: "/find-eal" }
        ]
    },
    {
        id: "master-data",
        name: "Master data",
        items: [
            { id: "08", label: "Items", permission: "masterdata:view", icon: LuWine, path: "/items" },
            { id: "09", label: "Packs", permission: "masterdata:view", icon: LuPackage, path: "/packs" },
            { id: "10", label: "Delivery Depots", permission: "masterdata:view", icon: LuWarehouse, path: "/delivery-depots" },
            { id: "11", label: "Companies", permission: "masterdata:view", icon: LuBuilding2, path: "/companies" }
        ]
    },
    {
        id: "administration",
        name: "Administration",
        items: [
            { id: "12", label: "Users", permission: "users:manage", icon: LuUsers, path: "/users" },
            { id: "13", label: "Roles", permission: "roles:manage", icon: LuShieldCheck, path: "/roles" }
        ]
    }
];

/** The group a page sits in, for the breadcrumb in the top bar. */
export const groupNameFor = (label) =>
    SIDE_MENU_GROUPS.find((group) => group.items.some((item) => item.label === label))?.name || "";

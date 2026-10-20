import {
    LuLayoutDashboard,
    LuDownload,
    LuFactory,
    LuTruck,
    LuTags,
    LuBoxes,
    LuScanSearch,
    LuWine,
    LuPackage,
    LuWarehouse
} from "react-icons/lu";

// The menu is grouped so the eleven destinations read as four short lists
// rather than one long one. `label` is what a page passes as `activeMenu`,
// so these strings must match the pages exactly.
export const SIDE_MENU_GROUPS = [
    {
        id: "operations",
        name: "Operations",
        items: [
            { id: "01", label: "Dashboard", icon: LuLayoutDashboard, path: "/dashboard" },
            { id: "02", label: "EAL Issuance", icon: LuDownload, path: "/eal-issuance" },
            { id: "03", label: "EAL Usage", icon: LuFactory, path: "/eal-usage" },
            { id: "04", label: "Dispatch", icon: LuTruck, path: "/dispatch" }
        ]
    },
    {
        id: "inventory",
        name: "Inventory",
        items: [
            { id: "05", label: "EAL Stock", icon: LuTags, path: "/eal-stock" },
            { id: "06", label: "Finished Stock", icon: LuBoxes, path: "/finished-stock" }
        ]
    },
    {
        id: "lookup",
        name: "Lookup",
        items: [
            { id: "07", label: "Find EAL", icon: LuScanSearch, path: "/find-eal" }
        ]
    },
    {
        id: "master-data",
        name: "Master data",
        items: [
            { id: "08", label: "Items", icon: LuWine, path: "/items" },
            { id: "09", label: "Packs", icon: LuPackage, path: "/packs" },
            { id: "10", label: "Delivery Depots", icon: LuWarehouse, path: "/delivery-depots" }
            // Companies and Users belong here too, but Companies has no route
            // in App.jsx and Users renders a placeholder, so listing them would
            // only give a menu item that goes nowhere. Add them back with the
            // pages.
        ]
    }
];

/** The group a page sits in, for the breadcrumb in the top bar. */
export const groupNameFor = (label) =>
    SIDE_MENU_GROUPS.find((group) => group.items.some((item) => item.label === label))?.name || "";

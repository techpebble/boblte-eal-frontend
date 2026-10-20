// export const BASE_URL = "http://localhost:8000/";
export const BASE_URL = "https://boblte-eal-api.techpebble.com/";

//utils/apiPaths.js
export const API_PATHS = {
    AUTH: {
        LOGIN: "api/v1/auth/login",
        GET_USER_INFO: "api/v1/auth/getUser",
    },
    DASHBOARD: {
        GET_DATA: 'api/v1/dashboard'
    },
    EALISSUANCE: {
        GET_DATA: 'api/v1/eal_issuance',
        ADD_DATA: 'api/v1/eal_issuance',
        DELETE_DATA: 'api/v1/eal_issuance'
    },
    EALUSAGE: {
        GET_DATA: 'api/v1/eal_usage',
        ADD_DATA: 'api/v1/eal_usage',
        FIND: 'api/v1/eal_usage/find'
    },
    EALDISPATCH: {
        GET_DATA: 'api/v1/dispatch/eal',
        ADD_EAL_LINK: 'api/v1/dispatch/eal/add_eal_link',
        REMOVE_EAL_LINK: 'api/v1/dispatch/eal/remove_eal_link'
    },
    DISPATCH: {
        GET_DATA: 'api/v1/dispatch',
        ADD_DATA: 'api/v1/dispatch',
        UPDATE_DATA: 'api/v1/dispatch',
        DELETE_DATA: 'api/v1/dispatch',
        UPDATE_STATUS: 'api/v1/dispatch/update_status',
        GET_DISPATCH_BY_ID: 'api/v1/dispatch/get_by_id'
    },
    COMPANY: {
        GET_DATA: 'api/v1/companies',
        ADD_DATA: 'api/v1/companies',
        UPDATE_DATA: 'api/v1/companies',
    },
    DELIVERY: {
        GET_DATA: 'api/v1/delivery',
        ADD_DATA: 'api/v1/delivery',
        UPDATE_DATA: 'api/v1/delivery',
    },
    PACK: {
        GET_DATA: 'api/v1/packs',
        ADD_DATA: 'api/v1/packs',
        UPDATE_DATA: 'api/v1/packs',
    },
    ITEM: {
        GET_DATA: 'api/v1/items',
        ADD_DATA: 'api/v1/items',
        UPDATE_DATA: 'api/v1/items',
        UPDATE_STATUS: 'api/v1/items',
    }
}
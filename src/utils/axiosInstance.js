import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // The API turns away clients that do not say which build they are, to
        // keep an out-of-date mobile app from writing records. A browser has no
        // build number, so the web app identifies itself instead.
        "X-Client": "web"
    }
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        //Handle common errors globally
        if (error.response) {
            if (error.response.status === 401) {
                // Redirect to login page
                window.location.href = '/login';
            } else if (error.response.status === 500) {
               console.error("Server error. Please try again later.") 
            }
        } else if (error.code === "ECONNABORTRD") {
            console.error("Request timeout. Please try again later.") 
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
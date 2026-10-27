import axios from "axios";
import { booting } from "@/runtime/recovery";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001/api/v1",
  timeout: 25000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("msfinancas_token");
  const familyId =
    sessionStorage.getItem("msfinancas_family_id") ||
    localStorage.getItem("msfinancas_family_id");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (familyId) {
    config.headers["X-Family-Id"] = familyId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!booting.value && !/\/auth\/(login|register|recover-password|reset-password)$/.test(error.config?.url || '')) {
        window.dispatchEvent(new Event('prumo:session-expired'));
      }
    }
    return Promise.reject(error);
  },
);

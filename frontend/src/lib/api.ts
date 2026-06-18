import axios from "axios";
import { useTenantStore } from "@/store/tenantStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
});

api.interceptors.request.use((config) => {
  const tenantHeader = import.meta.env.VITE_TENANT_HEADER ?? "X-Tenant-Id";
  const tenantId = useTenantStore.getState().tenantId;

  if (tenantId) {
    config.headers[tenantHeader] = tenantId;
  }

  return config;
});

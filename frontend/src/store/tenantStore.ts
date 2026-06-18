import { create } from "zustand";

type TenantState = {
  tenantId: string | null;
  setTenantId: (tenantId: string | null) => void;
};

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: null,
  setTenantId: (tenantId) => set({ tenantId })
}));

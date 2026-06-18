import { api } from "@/lib/api";
import type { ApiResponse, PageResponse } from "./motelService";

// ============ TYPES ============

export interface ContractResult {
  id: number;
  contractCode: string;
  tenantId: string;
  roomId: number;
  primaryResidentUserId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  depositStatus: "PENDING" | "HOLDING" | "REFUNDED" | "DEDUCTED";
  status: "ACTIVE" | "PENDING_LIQUIDATION" | "LIQUIDATED" | "CANCELLED";
  notes?: string;
  appendices?: ContractAppendix[];
  residents?: string[];
}

export interface ContractAppendix {
  id: number;
  contractId: number;
  type: string;
  newEndDate?: string;
  newMonthlyRent?: number;
  noticeDate?: string;
  note?: string;
  createdAt: string;
}

export interface ContractCreateRequest {
  roomId: number;
  primaryResidentUserId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  notes?: string;
  serviceIds?: number[];
  additionalResidentIds?: string[];
}

export interface ContractAdjustmentRequest {
  type: "EXTENSION" | "RENT_CHANGE" | "NOTICE_TO_VACATE";
  newEndDate?: string;
  newMonthlyRent?: number;
  noticeDate?: string;
  note?: string;
}

export interface ContractCancelRequest {
  reason: string;
}

export interface DepositCollectRequest {
  amount: number;
  notes?: string;
}

export interface DepositDeductRequest {
  deductAmount: number;
  reason: string;
}

export interface DamageItemInput {
  description: string;
  amount: number;
}

export interface SettlementRequest {
  contractId: number;
  moveOutDate: string;
  finalElectricReading?: number;
  finalWaterReading?: number;
  damages?: DamageItemInput[];
}

export interface SettlementCalculateResult {
  contractId: number;
  unpaidInvoicesTotal: number;
  depositAmount: number;
  deductedAmount: number;
  refundableDeposit: number;
  totalSettlementAmount: number;
  itemBreakdown: Array<{ description: string; amount: number }>;
}

export interface SettlementConfirmRequest {
  moveOutDate: string;
  finalElectricReading?: number;
  finalWaterReading?: number;
  damages?: DamageItemInput[];
}

// ============ CONTRACT APIs ============

export const contractService = {
  /** UC64: List contracts for a motel */
  async listByMotel(motelId: number, page = 0, size = 20, status?: string): Promise<PageResponse<ContractResult>> {
    const res = await api.get<ApiResponse<PageResponse<ContractResult>>>(
      `/api/contracts/motels/${motelId}`,
      { params: { page, size, status } }
    );
    return res.data.data;
  },

  /** UC65: Get contract detail */
  async get(contractId: number): Promise<ContractResult> {
    const res = await api.get<ApiResponse<ContractResult>>(`/api/contracts/${contractId}/detail`);
    return res.data.data;
  },

  /** UC63: Create contract */
  async create(data: ContractCreateRequest): Promise<ContractResult> {
    const res = await api.post<ApiResponse<ContractResult>>("/api/contracts", data);
    return res.data.data;
  },

  /** UC66: Add appendix (extension, rent change, notice) */
  async addAppendix(contractId: number, data: ContractAdjustmentRequest): Promise<ContractResult> {
    const res = await api.post<ApiResponse<ContractResult>>(
      `/api/contracts/${contractId}/adjustments`,
      data
    );
    return res.data.data;
  },

  /** UC67: Cancel contract */
  async cancel(contractId: number, data: ContractCancelRequest): Promise<void> {
    await api.post(`/api/contracts/${contractId}/cancel`, data);
  },

  /** UC69: Collect deposit */
  async collectDeposit(contractId: number, data: DepositCollectRequest): Promise<void> {
    await api.post(`/api/contracts/${contractId}/deposit/collect`, data);
  },

  /** UC69: Deduct from deposit */
  async deductDeposit(contractId: number, data: DepositDeductRequest): Promise<void> {
    await api.post(`/api/contracts/${contractId}/deposit/deduct`, data);
  },

  /** UC69: Refund deposit */
  async refundDeposit(contractId: number, notes?: string): Promise<void> {
    await api.post(`/api/contracts/${contractId}/deposit/refund`, { notes });
  },

  /** UC80: Calculate settlement */
  async calculateSettlement(data: SettlementRequest): Promise<SettlementCalculateResult> {
    const res = await api.post<SettlementCalculateResult>(
      "/api/v1/settlements/calculate",
      data
    );
    return res.data;
  },

  /** UC80: Confirm settlement */
  async confirmSettlement(contractId: number, data: SettlementConfirmRequest): Promise<void> {
    await api.post(`/api/v1/settlements/${contractId}/confirm`, data);
  },

  /** UC68: Export PDF */
  async exportPdf(contractId: number): Promise<Blob> {
    const res = await api.get(`/api/contracts/${contractId}/pdf`, { responseType: 'blob' });
    return res.data;
  },
};

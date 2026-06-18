import { api } from "@/lib/api";
import type { ApiResponse, PageResponse } from "./motelService";

// ============ TYPES ============

export interface InvoiceResult {
  id: number;
  tenantId: string;
  contractId: number;
  roomId: number;
  billingMonth: string;
  totalAmount: number;
  paidAmount: number;
  balanceDeduction: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "VOID";
  invoiceType: string;
  cancelReason?: string;
  dueDate?: string;
  details?: InvoiceDetail[];
}

export interface InvoiceDetail {
  id: number;
  serviceId: number;
  serviceName: string;
  chargeType: string;
  oldReading?: number;
  newReading?: number;
  consumption?: number;
  unitPrice: number;
  totalCost: number;
}

export interface InvoiceGenerationResult {
  generatedCount: number;
  invoiceIds: number[];
  billingMonth: string;
  motelId: number;
}

export interface InvoiceGenerateRequest {
  motelId: number;
  billingMonth: string; // Format: "YYYY-MM" → mapped to LocalDate
}

export interface MeterReadingResult {
  id: number;
  tenantId: string;
  roomId: number;
  serviceId: number;
  serviceName: string;
  serviceUsageId: number;
  billingMonth: string;
  oldReading: number;
  newReading?: number;
  consumption?: number;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  imageUrl?: string;
  ocrReading?: number;
}

export interface MeterReadingSubmitRequest {
  roomId: number;
  serviceId: number;
  billingMonth: string;
  newReading: number;
  readingImageUrl?: string;
}

export interface PaymentRequest {
  invoiceId: number;
  amount: number;
  paymentMethod: string;
}

export interface InvoiceAdjustRequest {
  reason: string;
  correctedReadings?: Record<number, number>;
  customAdjustments?: Record<number, number>;
}

// ============ INVOICE APIs ============

export const invoiceService = {
  /** UC73: Generate invoices for a motel */
  async generate(data: InvoiceGenerateRequest): Promise<InvoiceGenerationResult> {
    const billingMonth = data.billingMonth + "-01"; // Convert YYYY-MM to YYYY-MM-01
    const res = await api.post<InvoiceGenerationResult>("/api/v1/invoices/generate", {
      motelId: data.motelId,
      billingMonth,
    });
    return res.data;
  },

  /** UC74: List invoices */
  async list(status?: string, page = 0, size = 20): Promise<PageResponse<InvoiceResult>> {
    const res = await api.get<PageResponse<InvoiceResult>>("/api/v1/invoices", {
      params: { status, page, size },
    });
    return res.data;
  },

  /** UC74 (Resident): List my invoices */
  async listMine(status?: string, page = 0, size = 20): Promise<PageResponse<InvoiceResult>> {
    const res = await api.get<PageResponse<InvoiceResult>>("/api/v1/invoices/me", {
      params: { status, page, size },
    });
    return res.data;
  },

  /** UC75: Get invoice details */
  async get(invoiceId: number): Promise<InvoiceResult> {
    const res = await api.get<InvoiceResult>(`/api/v1/invoices/${invoiceId}`);
    return res.data;
  },

  /** UC76: Adjust invoice */
  async adjust(invoiceId: number, data: InvoiceAdjustRequest): Promise<InvoiceResult> {
    const res = await api.post<InvoiceResult>(`/api/v1/invoices/${invoiceId}/adjust`, data);
    return res.data;
  },

  /** UC77: Delete (void) invoice */
  async delete(invoiceId: number): Promise<void> {
    await api.delete(`/api/v1/invoices/${invoiceId}`);
  },
};

// ============ METER READING APIs ============

export const meterReadingService = {
  /** List meter readings (UC72) */
  async list(roomId?: number, status?: string, page = 0, size = 100): Promise<PageResponse<MeterReadingResult>> {
    const res = await api.get<PageResponse<MeterReadingResult>>("/api/v1/meter-readings", {
      params: { roomId, status, page, size },
    });
    return res.data;
  },

  /** UC70: Submit meter reading */
  async submit(data: MeterReadingSubmitRequest): Promise<MeterReadingResult> {
    const res = await api.post<MeterReadingResult>("/api/v1/meter-readings", data);
    return res.data;
  },

  /** UC72: Get reading history for a room */
  async getHistory(roomId: number): Promise<MeterReadingResult[]> {
    const res = await api.get<MeterReadingResult[]>(`/api/v1/meter-readings/rooms/${roomId}/history`);
    return res.data;
  },

  /** UC70: Approve meter reading */
  async approve(readingId: number): Promise<MeterReadingResult> {
    const res = await api.post<MeterReadingResult>(`/api/v1/meter-readings/${readingId}/approve`);
    return res.data;
  },

  /** UC70: Reject meter reading */
  async reject(readingId: number, reason?: string): Promise<MeterReadingResult> {
    const res = await api.post<MeterReadingResult>(
      `/api/v1/meter-readings/${readingId}/reject`,
      null,
      { params: { reason } }
    );
    return res.data;
  },
};

// ============ PAYMENT APIs ============

export const paymentService = {
  /** UC78: Process manual payment for invoice */
  async pay(data: PaymentRequest): Promise<void> {
    await api.post(`/api/v1/payments/manual`, data);
  },
};

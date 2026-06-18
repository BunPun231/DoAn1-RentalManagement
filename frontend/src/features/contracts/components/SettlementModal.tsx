import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { contractService, type SettlementCalculateResult } from "@/services/contractService";
import { formatCurrency } from "@/lib/utils";
import { extractError } from "@/lib/api";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  onSuccess: () => void;
}

export function SettlementModal({ isOpen, onClose, contractId, onSuccess }: SettlementModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [finalElectric, setFinalElectric] = useState("");
  const [finalWater, setFinalWater] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [calcResult, setCalcResult] = useState<SettlementCalculateResult | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await contractService.calculateSettlement({
        contractId,
        moveOutDate,
        finalElectricReading: finalElectric ? parseFloat(finalElectric) : undefined,
        finalWaterReading: finalWater ? parseFloat(finalWater) : undefined,
        damages: [], // Can add damage list later if needed
      });
      setCalcResult(result);
      setStep(2);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      await contractService.confirmSettlement(contractId, {
        moveOutDate,
        finalElectricReading: finalElectric ? parseFloat(finalElectric) : undefined,
        finalWaterReading: finalWater ? parseFloat(finalWater) : undefined,
        damages: [],
      });
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all bg-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thanh lý hợp đồng #${contractId}`}>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Ngày chuyển đi *</label>
            <input
              type="date"
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Số điện cuối</label>
              <input
                type="number"
                step="0.01"
                value={finalElectric}
                onChange={(e) => setFinalElectric(e.target.value)}
                placeholder="Để trống nếu ko có"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Số nước cuối</label>
              <input
                type="number"
                step="0.01"
                value={finalWater}
                onChange={(e) => setFinalWater(e.target.value)}
                placeholder="Để trống nếu ko có"
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang tính..." : "Tính toán thanh lý"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-brand-deep/5 p-4 rounded-xl border border-brand-deep/10 space-y-2">
            <h3 className="font-bold text-brand-ink mb-2">Kết quả tính toán</h3>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tiền cọc ban đầu:</span>
              <span className="font-medium">{formatCurrency(calcResult?.depositAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Đã khấu trừ:</span>
              <span className="font-medium text-rose-600">{formatCurrency(calcResult?.deductedAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tiền cọc còn lại:</span>
              <span className="font-medium text-emerald-600">{formatCurrency(calcResult?.refundableDeposit || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Nợ hóa đơn chưa đóng:</span>
              <span className="font-medium text-rose-600">{formatCurrency(calcResult?.unpaidInvoicesTotal || 0)}</span>
            </div>
            
            <div className="pt-2 mt-2 border-t border-brand-deep/10 flex justify-between font-bold">
              <span>Tổng thanh toán ({calcResult?.totalSettlementAmount! >= 0 ? "Khách nhận lại" : "Khách đóng thêm"}):</span>
              <span className={calcResult?.totalSettlementAmount! >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatCurrency(Math.abs(calcResult?.totalSettlementAmount || 0))}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>Quay lại</Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Đang xử lý..." : "Xác nhận thanh lý"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

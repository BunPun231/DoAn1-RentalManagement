import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Contract } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
}

export function SettlementModal({ isOpen, onClose, contract }: SettlementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [deduction, setDeduction] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 500);
  };

  const refundAmount = contract.depositAmount - deduction;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tất toán hợp đồng">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between mb-2">
            <span className="text-slate-600">Tiền cọc ban đầu:</span>
            <span className="font-bold text-brand-ink">{formatCurrency(contract.depositAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Tiền cọc phải trả lại:</span>
            <span className={`font-bold ${refundAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(refundAmount)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Input 
            label="Khấu trừ (hư hỏng, nợ phí...)" 
            type="number" 
            value={deduction || ""}
            onChange={(e) => setDeduction(Number(e.target.value))}
          />
          <Input label="Ghi chú tất toán" placeholder="Lý do khấu trừ..." />
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="danger" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận tất toán"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { paymentService } from "@/services/invoiceService";
import { formatCurrency } from "@/lib/utils";
import { extractError } from "@/lib/api";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  totalDebt: number;
  onSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, invoiceId, totalDebt, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState(totalDebt.toString());
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await paymentService.pay({
        invoiceId,
        amount: parseFloat(amount),
        paymentMethod: method,
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Thu tiền hóa đơn #${invoiceId}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-brand-deep/5 p-4 rounded-xl border border-brand-deep/10 text-center">
          <p className="text-sm text-slate-500 mb-1">Số tiền cần thu</p>
          <p className="text-2xl font-bold text-brand-ink">{formatCurrency(totalDebt)}</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Số tiền khách đưa *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1000}
            max={totalDebt * 2} // Allow some overpayment to save as credit? Or just limit to totalDebt.
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Hình thức thanh toán</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="E_WALLET">Ví điện tử</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận thu"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

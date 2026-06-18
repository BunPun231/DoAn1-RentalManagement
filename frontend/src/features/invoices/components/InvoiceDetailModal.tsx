import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Invoice } from "@/types";
import { mockRooms } from "@/data/mock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, Send, CreditCard } from "lucide-react";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function InvoiceDetailModal({ isOpen, onClose, invoice }: InvoiceDetailModalProps) {
  const room = mockRooms.find(r => r.id === invoice.roomId);

  const statusBadge = {
    PAID: <Badge variant="success">Đã thanh toán</Badge>,
    UNPAID: <Badge variant="warning">Chưa thanh toán</Badge>,
    OVERDUE: <Badge variant="danger">Quá hạn</Badge>,
    CANCELLED: <Badge variant="default">Đã hủy</Badge>
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Hóa đơn ${invoice.id.toUpperCase()}`} size="lg">
      <div className="space-y-6">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-brand-ink">Phòng {room?.name}</h2>
            <p className="text-slate-500">Kỳ hóa đơn: Tháng {invoice.month}</p>
          </div>
          <div className="text-right">
            {statusBadge[invoice.status]}
            <p className="text-sm text-slate-500 mt-2">Ngày lập: {formatDate(invoice.createdAt)}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-sm">
          <div className="flex justify-between pb-4 border-b border-slate-200">
            <span className="font-medium text-slate-700">Tiền phòng</span>
            <span className="font-bold text-slate-900">{formatCurrency(room?.price || 0)}</span>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">Tiền điện</h4>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Chỉ số: 1100 → 1250 (150 kWh)</span>
              <span>{formatCurrency(150 * 3500)}</span>
            </div>
            <p className="text-xs text-slate-400">Đơn giá: {formatCurrency(3500)}/kWh</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-700 mb-2">Tiền nước</h4>
            <div className="flex justify-between text-slate-600 mb-1">
              <span>Chỉ số: 40 → 48 (8 khối)</span>
              <span>{formatCurrency(8 * 20000)}</span>
            </div>
            <p className="text-xs text-slate-400">Đơn giá: {formatCurrency(20000)}/khối</p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <span className="font-semibold text-slate-700">Dịch vụ khác (Rác, Internet)</span>
            <span className="font-bold text-slate-900">{formatCurrency(150000)}</span>
          </div>

          <div className="flex justify-between pt-4 border-t-2 border-brand-deep/20">
            <span className="text-lg font-bold text-brand-ink">Tổng cộng</span>
            <span className="text-2xl font-bold text-red-600">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>

        <div className="pt-4 flex justify-between gap-4">
          <div className="flex gap-2">
            <Button variant="outline">
              <Printer size={16} className="mr-2" />
              In
            </Button>
            <Button variant="outline">
              <Send size={16} className="mr-2" />
              Gửi Zalo/Email
            </Button>
          </div>
          {invoice.status === "UNPAID" && (
            <Button className="bg-green-600 hover:bg-green-700">
              <CreditCard size={16} className="mr-2" />
              Xác nhận đã thu
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

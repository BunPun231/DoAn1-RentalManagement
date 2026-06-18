import { useState } from "react";
import { Plus, Search, FileText, Send, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { mockInvoices, mockRooms } from "@/data/mock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Invoice } from "@/types";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";

export function InvoiceListPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const unpaidTotal = mockInvoices
    .filter(i => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Hóa đơn</h1>
        <div className="flex gap-2">
          <Button variant="outline">Tạo hóa đơn loạt</Button>
          <Button>
            <Plus size={16} className="mr-2" />
            Tạo hóa đơn lẻ
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng thu dự kiến</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-1">{formatCurrency(45000000)}</h3>
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Đã thu</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(30000000)}</h3>
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <p className="text-sm font-medium text-slate-500">Còn nợ</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(unpaidTotal)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm theo phòng, mã HĐ..." 
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>
          <div className="flex gap-2">
            <input 
              type="month" 
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep"
              defaultValue="2026-05"
            />
            <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
              <option value="ALL">Tất cả trạng thái</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã HĐ & Phòng</TableHead>
              <TableHead>Kỳ HĐ</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInvoices.map((invoice) => {
              const room = mockRooms.find(r => r.id === invoice.roomId);
              
              const statusBadge = {
                PAID: <Badge variant="success">Đã thanh toán</Badge>,
                UNPAID: <Badge variant="warning">Chưa thanh toán</Badge>,
                OVERDUE: <Badge variant="danger">Quá hạn</Badge>,
                CANCELLED: <Badge variant="default">Đã hủy</Badge>
              };

              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-medium text-brand-ink">{invoice.id.toUpperCase()}</div>
                    <div className="text-sm font-semibold text-brand-deep">Phòng {room?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">Tháng {invoice.month}</div>
                    <div className="text-xs text-slate-500">Tạo: {formatDate(invoice.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-brand-ink">{formatCurrency(invoice.totalAmount)}</div>
                  </TableCell>
                  <TableCell>
                    {statusBadge[invoice.status]}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.status === "UNPAID" && (
                        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
                          <CreditCard size={14} className="mr-1.5" />
                          Thu tiền
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                        Chi tiết
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}

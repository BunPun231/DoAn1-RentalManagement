import { useState } from "react";
import { Plus, Search, FileSignature, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { mockContracts, mockRooms, mockResidents } from "@/data/mock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contract } from "@/types";
import { CreateContractModal } from "../components/CreateContractModal";
import { SettlementModal } from "../components/SettlementModal";

export function ContractListPage() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeCount = mockContracts.filter(c => c.status === "ACTIVE").length;
  const expiringCount = mockContracts.filter(c => c.status === "EXPIRING_SOON").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Hợp đồng & Đặt cọc</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Tạo hợp đồng mới
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-brand-deep/10 rounded-lg text-brand-deep">
            <FileSignature size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đang hiệu lực</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-1">{activeCount}</h3>
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg text-yellow-700">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Sắp hết hạn</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-1">{expiringCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm theo tên khách, phòng, mã HĐ..." 
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>
          <div className="flex gap-2">
            <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="EXPIRING_SOON">Sắp hết hạn</option>
              <option value="TERMINATED">Đã tất toán</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã HĐ & Phòng</TableHead>
              <TableHead>Người đại diện</TableHead>
              <TableHead>Thời hạn</TableHead>
              <TableHead>Tài chính</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockContracts.map((contract) => {
              const room = mockRooms.find(r => r.id === contract.roomId);
              const resident = mockResidents.find(r => r.id === contract.residentId);
              
              const statusBadge = {
                ACTIVE: <Badge variant="success">Đang hiệu lực</Badge>,
                EXPIRING_SOON: <Badge variant="warning">Sắp hết hạn</Badge>,
                EXPIRED: <Badge variant="danger">Đã hết hạn</Badge>,
                TERMINATED: <Badge variant="default">Đã tất toán</Badge>
              };

              return (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="font-medium text-brand-ink">{contract.id.toUpperCase()}</div>
                    <div className="text-sm font-semibold text-brand-deep">Phòng {room?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-700">{resident?.name}</div>
                    <div className="text-xs text-slate-500">{resident?.phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{formatDate(contract.startDate)}</div>
                    <div className="text-xs text-slate-500">đến {formatDate(contract.endDate)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-brand-ink">{formatCurrency(contract.rentPrice)}/tháng</div>
                    <div className="text-xs text-slate-500">Cọc: {formatCurrency(contract.depositAmount)}</div>
                  </TableCell>
                  <TableCell>
                    {statusBadge[contract.status]}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedContract(contract)}>
                      {contract.status === "ACTIVE" || contract.status === "EXPIRING_SOON" ? "Tất toán" : "Chi tiết"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <CreateContractModal 
          isOpen={isCreateOpen} 
          onClose={() => setIsCreateOpen(false)} 
        />

        {selectedContract && (
          <SettlementModal
            isOpen={!!selectedContract}
            onClose={() => setSelectedContract(null)}
            contract={selectedContract}
          />
        )}
      </div>
    </div>
  );
}

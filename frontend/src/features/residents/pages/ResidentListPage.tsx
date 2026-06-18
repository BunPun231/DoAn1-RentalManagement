import { useState } from "react";
import { Plus, Search, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { mockResidents, mockRooms } from "@/data/mock";
import { ResidentDetailModal } from "../components/ResidentDetailModal";
import { Resident } from "@/types";

export function ResidentListPage() {
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const activeCount = mockResidents.filter(r => r.status === "ACTIVE").length;
  const movedOutCount = mockResidents.filter(r => r.status === "MOVED_OUT").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Khách thuê</h1>
        <Button>
          <Plus size={16} className="mr-2" />
          Thêm khách mới
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-700">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đang thuê</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-1">{activeCount}</h3>
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-700">
            <UserMinus size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đã chuyển đi</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-1">{movedOutCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm theo tên, SĐT, CCCD..." 
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>
          <div className="flex gap-2">
            <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang thuê</option>
              <option value="MOVED_OUT">Đã chuyển đi</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Thông tin liên hệ</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Ngày vào ở</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockResidents.map((resident) => {
              const room = mockRooms.find(r => r.id === resident.roomId);
              return (
                <TableRow key={resident.id}>
                  <TableCell>
                    <div className="font-medium text-brand-ink">{resident.name}</div>
                    <div className="text-sm text-slate-500">CCCD: {resident.identityCard}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{resident.phone}</div>
                    <div className="text-sm text-slate-500">{resident.email || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-700">{room?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">
                      {new Date(resident.joinDate).toLocaleDateString('vi-VN')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={resident.status === "ACTIVE" ? "success" : "default"}>
                      {resident.status === "ACTIVE" ? "Đang thuê" : "Đã chuyển đi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedResident(resident)}>
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedResident && (
        <ResidentDetailModal
          isOpen={!!selectedResident}
          onClose={() => setSelectedResident(null)}
          resident={selectedResident}
        />
      )}
    </div>
  );
}

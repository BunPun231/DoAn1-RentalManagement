import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Search } from "lucide-react";

const mockAuditLogs = [
  { id: 1, action: "Xóa phòng", module: "Quản lý phòng", user: "Admin", time: "10:30 23/05/2026", details: "Xóa phòng P102 khu trọ HHT" },
  { id: 2, action: "Thêm khách thuê", module: "Khách thuê", user: "Nguyễn Văn A (Quản lý)", time: "09:15 23/05/2026", details: "Thêm Trần Thị B vào phòng P101" },
  { id: 3, action: "Cập nhật giá điện", module: "Dịch vụ", user: "Nguyễn Văn A (Quản lý)", time: "16:45 22/05/2026", details: "Đổi giá điện từ 3500 -> 3800" },
  { id: 4, action: "Đăng nhập", module: "Hệ thống", user: "Admin", time: "08:00 22/05/2026", details: "Đăng nhập thành công từ IP 192.168.1.1" },
];

export function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Nhật ký hoạt động (Audit Log)</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo user, hành động..." 
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
            />
          </div>
          <input type="date" className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Mô-đun</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAuditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-slate-500 whitespace-nowrap">{log.time}</TableCell>
                <TableCell className="font-medium text-brand-ink">{log.user}</TableCell>
                <TableCell>
                  <Badge variant={log.action.includes("Xóa") ? "danger" : log.action.includes("Thêm") ? "success" : "default"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{log.module}</TableCell>
                <TableCell className="text-sm text-slate-700">{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

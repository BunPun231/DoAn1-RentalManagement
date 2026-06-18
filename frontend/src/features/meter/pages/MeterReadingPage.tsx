import { useState } from "react";
import { Gauge, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { mockMeterReadings, mockRooms } from "@/data/mock";
import { MeterReading } from "@/types";
import { Modal } from "@/components/ui/Modal";

export function MeterReadingPage() {
  const [selectedMonth, setSelectedMonth] = useState("05/2026");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const unrecordedCount = mockMeterReadings.filter(m => m.status === "UNRECORDED" && m.month === selectedMonth).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Ghi chỉ số Điện Nước</h1>
        <div className="flex gap-2">
          <input 
            type="month" 
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep"
            defaultValue="2026-05"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Khu trọ:</span>
            <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
              <option value="m1">Khu trọ Hoàng Hoa Thám</option>
              <option value="m2">Khu trọ Lý Thường Kiệt</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-yellow-600 font-medium bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
              Chưa ghi: {unrecordedCount} phòng
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Chỉ số cũ</TableHead>
              <TableHead>Chỉ số mới</TableHead>
              <TableHead>Tiêu thụ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockMeterReadings.map((reading) => {
              const room = mockRooms.find(r => r.id === reading.roomId);
              return (
                <TableRow key={reading.id}>
                  <TableCell className="font-medium text-brand-ink">{room?.name}</TableCell>
                  <TableCell>
                    {reading.type === "ELECTRICITY" ? "Điện (kWh)" : "Nước (khối)"}
                  </TableCell>
                  <TableCell>{reading.oldIndex}</TableCell>
                  <TableCell className="font-medium">
                    {reading.status === "RECORDED" ? reading.newIndex : "-"}
                  </TableCell>
                  <TableCell className="text-brand-deep font-semibold">
                    {reading.status === "RECORDED" ? reading.consumption : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reading.status === "RECORDED" ? "success" : "warning"}>
                      {reading.status === "RECORDED" ? "Đã ghi" : "Chưa ghi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant={reading.status === "RECORDED" ? "outline" : "primary"} 
                      size="sm"
                      onClick={() => {
                        setSelectedRoomId(reading.roomId);
                        setIsRecordModalOpen(true);
                      }}
                    >
                      <Gauge size={14} className="mr-2" />
                      {reading.status === "RECORDED" ? "Sửa chỉ số" : "Ghi chỉ số"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecordMeterModal 
        isOpen={isRecordModalOpen} 
        onClose={() => setIsRecordModalOpen(false)} 
        roomId={selectedRoomId} 
      />
    </div>
  );
}

function RecordMeterModal({ isOpen, onClose, roomId }: { isOpen: boolean, onClose: () => void, roomId: string | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const room = mockRooms.find(r => r.id === roomId);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ghi chỉ số - Phòng ${room?.name}`}>
      <div className="space-y-6">
        <div className="flex gap-4 p-4 bg-brand-deep/5 rounded-xl border border-brand-deep/10">
          <div className="flex-1">
            <p className="text-sm text-slate-500 mb-1">Chỉ số điện cũ</p>
            <p className="text-xl font-bold text-slate-700">1100</p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500 mb-1">Chỉ số nước cũ</p>
            <p className="text-xl font-bold text-slate-700">40</p>
          </div>
        </div>

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Chỉ số điện mới" type="number" required />
            <Input label="Chỉ số nước mới" type="number" required />
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Hoặc ghi tự động bằng AI (OCR)</p>
            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1 border-dashed h-20 text-slate-500 hover:bg-slate-50">
                <div className="flex flex-col items-center">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-xs">Chụp đồng hồ điện</span>
                </div>
              </Button>
              <Button type="button" variant="outline" className="flex-1 border-dashed h-20 text-slate-500 hover:bg-slate-50">
                <div className="flex flex-col items-center">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-xs">Chụp đồng hồ nước</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit">Lưu chỉ số</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

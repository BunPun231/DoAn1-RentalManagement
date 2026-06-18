import { useState, useEffect, useCallback, useMemo } from "react";
import { Gauge, RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { meterReadingService, type MeterReadingResult, type MeterReadingSubmitRequest } from "@/services/invoiceService";
import { motelService, roomService, type MotelResult, type RoomResult } from "@/services/motelService";
import { serviceService, type ServiceResult } from "@/services/serviceService";
import { extractError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STATUS_BADGE: Record<string, React.ReactNode> = {
  PENDING: <Badge variant="warning">Chờ ghi / Chưa duyệt</Badge>,
  SUBMITTED: <Badge variant="default">Đã nộp</Badge>,
  APPROVED: <Badge variant="success">Đã duyệt</Badge>,
  REJECTED: <Badge variant="danger">Từ chối</Badge>,
};

function SubmitReadingModal({
  isOpen,
  onClose,
  roomId,
  serviceId,
  serviceName,
  billingMonth,
  oldReading,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  serviceId: number;
  serviceName: string;
  billingMonth: string;
  oldReading: number;
  onSuccess: () => void;
}) {
  const [newReading, setNewReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: MeterReadingSubmitRequest = {
        roomId,
        serviceId,
        billingMonth: billingMonth + "-01", // format YYYY-MM-01
        newReading: parseFloat(newReading)
      };
      await meterReadingService.submit(payload);
      setNewReading("");
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ghi chỉ số ${serviceName} - Phòng P.${roomId}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-4 p-4 bg-brand-deep/5 rounded-xl border border-brand-deep/10">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Kỳ thanh toán</p>
            <p className="font-bold text-slate-700">
              {billingMonth}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Chỉ số đầu kỳ</p>
            <p className="text-xl font-bold text-slate-700">{oldReading}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Chỉ số cuối kỳ *</label>
          <input
            id="meter-new-reading"
            type="number"
            step="0.01"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
            min={oldReading}
            required
            placeholder={`Nhập chỉ số mới (> ${oldReading})`}
            className={inputClass}
          />
        </div>

        {newReading && parseFloat(newReading) >= oldReading && (
          <div className="bg-emerald-50 rounded-xl p-3 text-sm">
            <span className="text-slate-500">Tiêu thụ: </span>
            <span className="font-bold text-emerald-700">
              {(parseFloat(newReading) - oldReading).toFixed(2)} đơn vị
            </span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Đang lưu..." : "Ghi chỉ số"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function MeterReadingPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [motels, setMotels] = useState<MotelResult[]>([]);
  const [selectedMotelId, setSelectedMotelId] = useState<number | null>(null);
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [rooms, setRooms] = useState<RoomResult[]>([]);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [readings, setReadings] = useState<MeterReadingResult[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [submittingData, setSubmittingData] = useState<{ roomId: number, serviceId: number, serviceName: string, oldReading: number } | null>(null);

  // Fetch motels
  useEffect(() => {
    motelService.list().then((res) => {
      setMotels(res.content);
      if (res.content.length > 0) setSelectedMotelId(res.content[0].id);
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedMotelId) return;
    setLoading(true);
    try {
      const [roomsRes, servicesRes, readingsRes] = await Promise.all([
        roomService.list(selectedMotelId),
        serviceService.list(selectedMotelId),
        meterReadingService.list(undefined, undefined, 0, 1000)
      ]);
      setRooms(roomsRes.content);
      setServices(servicesRes.filter(s => s.chargeType === "METERED"));
      setReadings(readingsRes.content);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedMotelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform data into a matrix of Room x Service
  const tableData = useMemo(() => {
    const data = [];
    const targetMonth = billingMonth + "-01";
    
    for (const room of rooms) {
      // Only show rooms that are not empty (optional, but good for UI)
      if (room.status === "AVAILABLE" || room.status === "OUT_OF_BUSINESS" || room.status === "REPAIRING") continue;
      
      for (const service of services) {
        // Find existing reading for this month
        const currentReading = readings.find(r => 
          r.roomId === room.id && 
          r.serviceId === service.id && 
          r.billingMonth === targetMonth
        );
        
        // Calculate old reading by finding the latest APPROVED reading before this month
        let oldReading = 0;
        const pastReadings = readings.filter(r => 
          r.roomId === room.id && 
          r.serviceId === service.id && 
          r.status === "APPROVED" &&
          new Date(r.billingMonth) < new Date(targetMonth)
        ).sort((a, b) => new Date(b.billingMonth).getTime() - new Date(a.billingMonth).getTime());
        
        if (pastReadings.length > 0) {
          oldReading = pastReadings[0].newReading || 0;
        }

        data.push({
          roomId: room.id,
          roomNumber: room.roomNumber,
          serviceId: service.id,
          serviceName: service.name,
          oldReading,
          currentReading
        });
      }
    }
    return data;
  }, [rooms, services, readings, billingMonth]);

  const pendingCount = tableData.filter(d => !d.currentReading || d.currentReading.status === "PENDING" || d.currentReading.status === "SUBMITTED").length;

  const handleApprove = async (readingId: number) => {
    try {
      await meterReadingService.approve(readingId);
      fetchData();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const handleReject = async (readingId: number) => {
    const reason = prompt("Lý do từ chối:");
    if (!reason) return;
    try {
      await meterReadingService.reject(readingId, reason);
      fetchData();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const selectClass = "h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/20 bg-white";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-ink">Ghi chỉ số Điện Nước</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý số liệu điện nước hàng tháng</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              id="meter-motel"
              value={selectedMotelId ?? ""}
              onChange={(e) => setSelectedMotelId(Number(e.target.value))}
              className={selectClass}
            >
              {motels.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input
              id="meter-billing-month"
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className={selectClass}
            />
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
              <AlertCircle size={16} />
              {pendingCount} mục chưa chốt số
            </div>
          )}
        </div>

        {error ? (
          <div className="p-12 flex flex-col items-center">
            <AlertCircle size={32} className="text-red-400 mb-3" />
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Button size="sm" onClick={fetchData}>Thử lại</Button>
          </div>
        ) : loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-deep border-t-transparent" />
          </div>
        ) : tableData.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center">
            <Gauge size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Không tìm thấy phòng đang thuê hoặc dịch vụ đo đếm nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Dịch vụ</TableHead>
                  <TableHead>Chỉ số đầu kỳ</TableHead>
                  <TableHead>Chỉ số cuối kỳ</TableHead>
                  <TableHead>Tiêu thụ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-brand-ink">
                      P.{row.roomNumber}
                    </TableCell>
                    <TableCell>{row.serviceName}</TableCell>
                    <TableCell>{row.oldReading}</TableCell>
                    <TableCell className="font-medium">
                      {row.currentReading?.newReading ?? "-"}
                    </TableCell>
                    <TableCell className="text-brand-deep font-semibold">
                      {row.currentReading?.consumption != null ? row.currentReading.consumption : "-"}
                    </TableCell>
                    <TableCell>
                      {row.currentReading 
                        ? (STATUS_BADGE[row.currentReading.status] ?? <Badge>{row.currentReading.status}</Badge>)
                        : <Badge variant="default" className="bg-slate-100 text-slate-500 border-slate-200">Chưa ghi</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!row.currentReading && (
                          <Button
                            size="sm"
                            onClick={() => setSubmittingData({ 
                              roomId: row.roomId, 
                              serviceId: row.serviceId, 
                              serviceName: row.serviceName, 
                              oldReading: row.oldReading 
                            })}
                          >
                            <Gauge size={14} className="mr-1.5" />
                            Ghi chỉ số
                          </Button>
                        )}
                        {isManager && row.currentReading && (row.currentReading.status === "PENDING" || row.currentReading.status === "SUBMITTED") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleApprove(row.currentReading!.id)}
                            >
                              <CheckCircle2 size={14} className="mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleReject(row.currentReading!.id)}
                            >
                              <XCircle size={14} className="mr-1" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SubmitReadingModal
        isOpen={!!submittingData}
        onClose={() => setSubmittingData(null)}
        roomId={submittingData?.roomId || 0}
        serviceId={submittingData?.serviceId || 0}
        serviceName={submittingData?.serviceName || ""}
        billingMonth={billingMonth}
        oldReading={submittingData?.oldReading || 0}
        onSuccess={() => {
          setSubmittingData(null);
          fetchData();
        }}
      />
    </div>
  );
}

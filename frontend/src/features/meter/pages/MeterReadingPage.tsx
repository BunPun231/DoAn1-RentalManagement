import { useState, useEffect, useCallback } from "react";
import { Gauge, RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { meterReadingService, type MeterReadingResult } from "@/services/invoiceService";
import { motelService, type MotelResult } from "@/services/motelService";
import { extractError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STATUS_BADGE: Record<string, React.ReactNode> = {
  PENDING: <Badge variant="warning">Chờ ghi</Badge>,
  SUBMITTED: <Badge variant="default">Đã nộp</Badge>,
  APPROVED: <Badge variant="success">Đã duyệt</Badge>,
  REJECTED: <Badge variant="danger">Từ chối</Badge>,
};

function SubmitReadingModal({
  isOpen,
  onClose,
  reading,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  reading: MeterReadingResult | null;
  onSuccess: () => void;
}) {
  const [newReading, setNewReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reading) return;
    setError("");
    setLoading(true);
    try {
      await meterReadingService.submit(reading.id, { newReading: parseFloat(newReading) });
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Ghi chỉ số - Phòng ${reading?.roomId}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-4 p-4 bg-brand-deep/5 rounded-xl border border-brand-deep/10">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Kỳ thanh toán</p>
            <p className="font-bold text-slate-700">
              {reading?.billingMonth
                ? new Date(reading.billingMonth).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
                : "-"}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Chỉ số đầu kỳ</p>
            <p className="text-xl font-bold text-slate-700">{reading?.oldReading ?? "-"}</p>
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
            min={reading?.oldReading ?? 0}
            required
            placeholder={`Nhập chỉ số mới (> ${reading?.oldReading ?? 0})`}
            className={inputClass}
          />
        </div>

        {newReading && reading && parseFloat(newReading) >= reading.oldReading && (
          <div className="bg-emerald-50 rounded-xl p-3 text-sm">
            <span className="text-slate-500">Tiêu thụ: </span>
            <span className="font-bold text-emerald-700">
              {(parseFloat(newReading) - reading.oldReading).toFixed(2)} đơn vị
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
  const [readings, setReadings] = useState<MeterReadingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReading, setSelectedReading] = useState<MeterReadingResult | null>(null);

  useEffect(() => {
    motelService.list().then((res) => {
      setMotels(res.content);
      if (res.content.length > 0) setSelectedMotelId(res.content[0].id);
    });
  }, []);

  const fetchReadings = useCallback(async () => {
    if (!selectedMotelId) return;
    setLoading(true);
    try {
      const result = await meterReadingService.listByMotel(selectedMotelId, billingMonth + "-01");
      setReadings(result);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedMotelId, billingMonth]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const pendingCount = readings.filter((r) => r.status === "PENDING" || r.status === "SUBMITTED").length;

  const handleApprove = async (readingId: number) => {
    try {
      await meterReadingService.approve(readingId);
      fetchReadings();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const handleReject = async (readingId: number) => {
    const reason = prompt("Lý do từ chối:");
    if (!reason) return;
    try {
      await meterReadingService.reject(readingId, reason);
      fetchReadings();
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
        <Button variant="outline" onClick={fetchReadings} disabled={loading}>
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
              {pendingCount} phòng chưa hoàn thành
            </div>
          )}
        </div>

        {error ? (
          <div className="p-12 flex flex-col items-center">
            <AlertCircle size={32} className="text-red-400 mb-3" />
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Button size="sm" onClick={fetchReadings}>Thử lại</Button>
          </div>
        ) : loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-deep border-t-transparent" />
          </div>
        ) : readings.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center">
            <Gauge size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Chưa có dữ liệu chỉ số</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng</TableHead>
                <TableHead>Chỉ số đầu kỳ</TableHead>
                <TableHead>Chỉ số cuối kỳ</TableHead>
                <TableHead>Tiêu thụ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.map((reading) => (
                <TableRow key={reading.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-brand-ink">
                    Phòng {reading.roomId}
                  </TableCell>
                  <TableCell>{reading.oldReading}</TableCell>
                  <TableCell className="font-medium">
                    {reading.newReading ?? "-"}
                  </TableCell>
                  <TableCell className="text-brand-deep font-semibold">
                    {reading.consumption != null ? reading.consumption : "-"}
                  </TableCell>
                  <TableCell>{STATUS_BADGE[reading.status] ?? <Badge>{reading.status}</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(reading.status === "PENDING") && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedReading(reading)}
                        >
                          <Gauge size={14} className="mr-1.5" />
                          Ghi chỉ số
                        </Button>
                      )}
                      {isManager && reading.status === "SUBMITTED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleApprove(reading.id)}
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(reading.id)}
                          >
                            <XCircle size={14} className="mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}
                      {(reading.status === "APPROVED" || reading.status === "REJECTED") && (
                        <Button variant="outline" size="sm" disabled>
                          Xem chi tiết
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <SubmitReadingModal
        isOpen={!!selectedReading}
        onClose={() => setSelectedReading(null)}
        reading={selectedReading}
        onSuccess={() => {
          setSelectedReading(null);
          fetchReadings();
        }}
      />
    </div>
  );
}

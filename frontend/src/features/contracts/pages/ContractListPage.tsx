import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileSignature, AlertCircle, RefreshCw, ChevronDown, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { contractService, type ContractResult, type ContractCreateRequest } from "@/services/contractService";
import { motelService, roomService, type MotelResult, type RoomResult } from "@/services/motelService";
import { residentService, type ResidentResult } from "@/services/residentService";
import { extractError } from "@/lib/api";
import { SettlementModal } from "../components/SettlementModal";

// ============ STATUS HELPERS ============
const STATUS_BADGE: Record<string, React.ReactNode> = {
  ACTIVE: <Badge variant="success">Đang hiệu lực</Badge>,
  PENDING_LIQUIDATION: <Badge variant="warning">Chờ tất toán</Badge>,
  LIQUIDATED: <Badge variant="default">Đã tất toán</Badge>,
  CANCELLED: <Badge variant="danger">Đã hủy</Badge>,
};

const DEPOSIT_BADGE: Record<string, React.ReactNode> = {
  PENDING: <Badge variant="warning">Chưa thu</Badge>,
  HOLDING: <Badge variant="success">Đang giữ</Badge>,
  REFUNDED: <Badge variant="default">Đã hoàn</Badge>,
  DEDUCTED: <Badge variant="danger">Đã khấu trừ</Badge>,
};

// ============ CREATE CONTRACT MODAL ============
function CreateContractModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [motels, setMotels] = useState<MotelResult[]>([]);
  const [rooms, setRooms] = useState<RoomResult[]>([]);
  const [residents, setResidents] = useState<ResidentResult[]>([]);
  const [motelId, setMotelId] = useState("");
  const [form, setForm] = useState<Partial<ContractCreateRequest>>({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      motelService.list().then((r) => { setMotels(r.content); if (r.content.length > 0) setMotelId(String(r.content[0].id)); });
      residentService.list(0, 100).then((r) => setResidents(r.content));
    }
  }, [isOpen]);

  useEffect(() => {
    if (motelId) {
      roomService.list(Number(motelId)).then((r) =>
        setRooms(r.content.filter((room) => room.status === "AVAILABLE"))
      );
    }
  }, [motelId]);

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await contractService.create(form as ContractCreateRequest);
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === form.roomId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo hợp đồng mới" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s < step ? "bg-emerald-500 text-white" : s === step ? "bg-brand-deep text-white" : "bg-slate-100 text-slate-400"
            }`}>
              {s < step ? <CheckCircle2 size={14} /> : s}
            </div>
            <span className={`text-xs font-medium ${s === step ? "text-brand-ink" : "text-slate-400"}`}>
              {s === 1 ? "Phòng & Thời hạn" : s === 2 ? "Khách thuê" : "Tài chính"}
            </span>
            {s < 3 && <div className="flex-1 h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Room & Dates */}
        {step === 1 && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Khu trọ *</label>
              <select id="contract-motel" value={motelId} onChange={(e) => setMotelId(e.target.value)} className={inputClass}>
                {motels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phòng (chỉ phòng trống) *</label>
              <select
                id="contract-room"
                value={form.roomId ?? ""}
                onChange={(e) => setForm({ ...form, roomId: Number(e.target.value) })}
                required
                className={inputClass}
              >
                <option value="">-- Chọn phòng --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} - Tầng {r.floor} ({formatCurrency(r.basePrice)}/tháng)
                  </option>
                ))}
              </select>
              {selectedRoom && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ Giá phòng: {formatCurrency(selectedRoom.basePrice)}/tháng
                  {selectedRoom.area ? ` • ${selectedRoom.area}m²` : ""}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Ngày bắt đầu *</label>
                <input id="contract-start" type="date" value={form.startDate ?? ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Ngày kết thúc *</label>
                <input id="contract-end" type="date" value={form.endDate ?? ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required className={inputClass} />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Resident */}
        {step === 2 && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Người đại diện (khách thuê chính) *</label>
              <select
                id="contract-resident"
                value={form.primaryResidentUserId ?? ""}
                onChange={(e) => setForm({ ...form, primaryResidentUserId: e.target.value })}
                required
                className={inputClass}
              >
                <option value="">-- Chọn khách thuê --</option>
                {residents.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.fullName} — {r.phone} {r.idCardNumber ? `(CCCD: ${r.idCardNumber})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">
              💡 Chỉ khách thuê đã có hồ sơ trong hệ thống mới có thể chọn. <br />
              Nếu chưa có, hãy <strong>thêm khách thuê trước</strong> tại mục Khách thuê.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Ghi chú hợp đồng</label>
              <textarea
                id="contract-notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Điều khoản bổ sung, ghi chú đặc biệt..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </>
        )}

        {/* Step 3: Finance */}
        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tiền thuê/tháng (đ) *</label>
                <input
                  id="contract-rent"
                  type="number"
                  value={form.monthlyRent ?? ""}
                  onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })}
                  required
                  placeholder={selectedRoom ? String(selectedRoom.basePrice) : "0"}
                  min={0}
                  className={inputClass}
                />
                {selectedRoom && !form.monthlyRent && (
                  <button type="button" className="text-xs text-brand-deep underline mt-0.5"
                    onClick={() => setForm({ ...form, monthlyRent: selectedRoom.basePrice })}>
                    Dùng giá phòng ({formatCurrency(selectedRoom.basePrice)})
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tiền đặt cọc (đ) *</label>
                <input
                  id="contract-deposit"
                  type="number"
                  value={form.depositAmount ?? ""}
                  onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                  required
                  min={0}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
            {form.monthlyRent && form.depositAmount && (
              <div className="bg-brand-deep/5 rounded-xl p-4 space-y-2 text-sm border border-brand-deep/10">
                <div className="flex justify-between">
                  <span className="text-slate-500">Giá thuê/tháng</span>
                  <span className="font-semibold">{formatCurrency(form.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền cọc</span>
                  <span className="font-semibold">{formatCurrency(form.depositAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-brand-deep/10 pt-2 font-semibold text-brand-deep">
                  <span>Thanh toán ban đầu</span>
                  <span>{formatCurrency(form.monthlyRent + form.depositAmount)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="pt-4 border-t border-slate-100 flex justify-between">
          <Button type="button" variant="outline" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>
            {step === 1 ? "Hủy" : "← Quay lại"}
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && (!form.roomId || !form.startDate || !form.endDate)) ||
                (step === 2 && !form.primaryResidentUserId)
              }
            >
              Tiếp theo →
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "✓ Tạo hợp đồng"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ============ CONTRACT DETAIL MODAL ============
function ContractDetailModal({
  contract,
  onClose,
  onRefresh,
}: {
  contract: ContractResult;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCancel = async () => {
    const reason = prompt("Lý do hủy hợp đồng:");
    if (!reason) return;
    setLoading(true);
    try {
      await contractService.cancel(contract.id, { reason });
      onClose();
      onRefresh();
    } catch (err) {
      alert(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCollectDeposit = async () => {
    if (!confirm(`Xác nhận thu cọc ${formatCurrency(contract.depositAmount)}?`)) return;
    setLoading(true);
    try {
      await contractService.collectDeposit(contract.id, { amount: contract.depositAmount });
      onRefresh();
      onClose();
    } catch (err) {
      alert(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await contractService.exportPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HopDong_${contract.contractCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(extractError(err));
    } finally {
      setDownloading(false);
    }
  };

  const rows = [
    { label: "Mã hợp đồng", value: contract.contractCode },
    { label: "Phòng", value: `Phòng ${contract.roomId}` },
    { label: "Thời hạn", value: `${contract.startDate} → ${contract.endDate}` },
    { label: "Tiền thuê", value: formatCurrency(contract.monthlyRent) + "/tháng" },
    { label: "Tiền cọc", value: formatCurrency(contract.depositAmount) },
    { label: "Trạng thái cọc", value: DEPOSIT_BADGE[contract.depositStatus] },
  ];

  return (
    <Modal isOpen onClose={onClose} title="Chi tiết hợp đồng" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-slate-400">#{contract.id}</span>
          {STATUS_BADGE[contract.status]}
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 px-4 hover:bg-slate-50">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-medium text-slate-800">{value}</span>
            </div>
          ))}
        </div>

        {contract.notes && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
            <p className="text-sm text-slate-700">{contract.notes}</p>
          </div>
        )}

        {contract.appendices && contract.appendices.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Phụ lục điều chỉnh</h4>
            <div className="space-y-2">
              {contract.appendices.map((app) => (
                <div key={app.id} className="text-xs p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between">
                  <div>
                    <span className="font-semibold">{app.type}</span>
                    {app.newEndDate && <span> - Gia hạn đến: {app.newEndDate}</span>}
                    {app.newMonthlyRent && <span> - Giá mới: {formatCurrency(app.newMonthlyRent)}</span>}
                    {app.note && <p className="text-slate-500 mt-1">{app.note}</p>}
                  </div>
                  <span className="text-slate-400">{new Date(app.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
        <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
          {downloading ? "Đang xuất PDF..." : "Xuất PDF"}
        </Button>
        <div className="flex gap-2">
          {contract.depositStatus === "PENDING" && contract.status !== "CANCELLED" && (
            <Button
              variant="outline"
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={handleCollectDeposit}
              disabled={loading}
            >
              Thu cọc
            </Button>
          )}
          {contract.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => {
                  const newEndDate = prompt("Gia hạn đến ngày (YYYY-MM-DD):");
                  if (!newEndDate) return;
                  contractService.addAppendix(contract.id, { type: "EXTENSION", newEndDate })
                    .then(() => { onClose(); onRefresh(); })
                    .catch((err) => alert(extractError(err)));
                }}
              >
                Gia hạn
              </Button>
              <Button variant="danger" onClick={handleCancel} disabled={loading}>
                {loading ? "Đang xử lý..." : "Hủy hợp đồng"}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============ MAIN PAGE ============
export function ContractListPage() {
  const [contracts, setContracts] = useState<ContractResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractResult | null>(null);
  const [settlementContractId, setSettlementContractId] = useState<number | null>(null);

  // For listing, we need a motelId — load first available motel
  const [motels, setMotels] = useState<MotelResult[]>([]);
  const [selectedMotelId, setSelectedMotelId] = useState<number | null>(null);

  useEffect(() => {
    motelService.list().then((r) => {
      setMotels(r.content);
      if (r.content.length > 0) setSelectedMotelId(r.content[0].id);
    });
  }, []);

  const fetchContracts = useCallback(async () => {
    if (!selectedMotelId) return;
    setLoading(true);
    try {
      const result = await contractService.listByMotel(
        selectedMotelId, page, 20, statusFilter || undefined
      );
      setContracts(result.content);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedMotelId, page, statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const filtered = contracts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contractCode?.toLowerCase().includes(q) ||
      String(c.roomId).includes(q) ||
      c.primaryResidentUserId?.toLowerCase().includes(q)
    );
  });

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const pendingCount = contracts.filter((c) => c.status === "PENDING_LIQUIDATION").length;

  const selectClass = "h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/20 bg-white";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle size={40} className="text-red-400 mb-3" />
        <p className="text-slate-600 mb-4">{error}</p>
        <Button onClick={fetchContracts}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-ink">Hợp đồng & Đặt cọc</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý hợp đồng thuê phòng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchContracts} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button id="create-contract-btn" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-2" />
            Tạo hợp đồng mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-brand-deep/10 rounded-xl text-brand-deep">
            <FileSignature size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Đang hiệu lực</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-0.5">{activeCount}</h3>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Chờ tất toán</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-0.5">{pendingCount}</h3>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng hợp đồng</p>
            <h3 className="text-2xl font-bold text-brand-ink mt-0.5">{contracts.length}</h3>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="contract-search"
                type="text"
                placeholder="Tìm theo phòng, mã HĐ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-deep/20 transition-all"
              />
            </div>
            <select value={selectedMotelId ?? ""} onChange={(e) => setSelectedMotelId(Number(e.target.value))} className={selectClass}>
              {motels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <select
            id="contract-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className={selectClass}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="PENDING_LIQUIDATION">Chờ tất toán</option>
            <option value="LIQUIDATED">Đã tất toán</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-deep border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center">
            <FileSignature size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Chưa có hợp đồng nào</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Tạo hợp đồng để bắt đầu quản lý khách thuê</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} className="mr-2" />
              Tạo hợp đồng đầu tiên
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã HĐ & Phòng</TableHead>
                <TableHead>Khách đại diện</TableHead>
                <TableHead>Thời hạn</TableHead>
                <TableHead>Tài chính</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => {
                const isExpiringSoon = contract.status === "ACTIVE" && contract.endDate &&
                  new Date(contract.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <TableRow key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="font-mono text-xs text-slate-400">#{contract.contractCode}</div>
                      <div className="font-semibold text-brand-deep">Phòng {contract.roomId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 font-mono">
                        {contract.primaryResidentUserId?.slice(0, 12)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700">
                        {contract.startDate ? new Date(contract.startDate).toLocaleDateString("vi-VN") : "-"}
                      </div>
                      <div className={`text-xs ${isExpiringSoon ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                        {isExpiringSoon && "⚠ "}
                        đến {contract.endDate ? new Date(contract.endDate).toLocaleDateString("vi-VN") : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-brand-ink">{formatCurrency(contract.monthlyRent)}/tháng</div>
                      <div className="text-xs text-slate-400">
                        Cọc: {formatCurrency(contract.depositAmount)} • {DEPOSIT_BADGE[contract.depositStatus]}
                      </div>
                    </TableCell>
                    <TableCell>{STATUS_BADGE[contract.status] ?? <Badge>{contract.status}</Badge>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                        onClick={() => setSettlementContractId(contract.id)}
                      >
                        <Ban size={14} className="mr-1.5" />
                        Thanh lý
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContract(contract)}
                      >
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <span className="px-4 py-1.5 text-sm text-slate-600">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateContractModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => { setIsCreateOpen(false); fetchContracts(); }}
      />

      {selectedContract && (
        <ContractDetailModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onRefresh={fetchContracts}
        />
      )}

      {settlementContractId && (
        <SettlementModal
          isOpen={!!settlementContractId}
          onClose={() => setSettlementContractId(null)}
          contractId={settlementContractId}
          onSuccess={() => {
            setSettlementContractId(null);
            fetchContracts();
          }}
        />
      )}
    </div>
  );
}

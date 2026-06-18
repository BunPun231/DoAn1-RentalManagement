import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, RefreshCw, AlertCircle, Zap, Building2, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { serviceService, type ServiceResult, type ServiceCreateRequest, type ServiceUpdateRequest } from "@/services/serviceService";
import { motelService, type MotelResult } from "@/services/motelService";
import { extractError } from "@/lib/api";

const CHARGE_TYPE_LABEL: Record<string, string> = {
  FIXED: "Cố định",
  METERED: "Theo đồng hồ",
  TIERED: "Bậc thang",
};

const CHARGE_TYPE_COLOR: Record<string, string> = {
  FIXED: "bg-violet-100 text-violet-700",
  METERED: "bg-blue-100 text-blue-700",
  TIERED: "bg-emerald-100 text-emerald-700",
};

// ============ SERVICE FORM MODAL ============
function ServiceFormModal({
  isOpen,
  onClose,
  onSuccess,
  motelId,
  editing,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  motelId: number;
  editing?: ServiceResult;
}) {
  const [form, setForm] = useState<ServiceCreateRequest>({
    name: "",
    chargeType: "FIXED",
    unit: "",
    mandatory: false,
    basePrice: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        chargeType: editing.chargeType,
        unit: editing.unit ?? "",
        mandatory: editing.mandatory,
        basePrice: editing.basePrice ?? 0,
        pricingTiers: editing.pricingTiers,
      });
    } else {
      setForm({ name: "", chargeType: "FIXED", unit: "", mandatory: false, basePrice: 0 });
    }
    setError("");
  }, [editing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (editing) {
        await serviceService.update(motelId, editing.id, form as ServiceUpdateRequest);
      } else {
        await serviceService.create(motelId, form);
      }
      onSuccess();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Tên dịch vụ *</label>
          <input
            id="service-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="VD: Điện, Nước, Internet..."
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Loại tính phí *</label>
            <select
              id="service-charge-type"
              value={form.chargeType}
              onChange={(e) => setForm({ ...form, chargeType: e.target.value })}
              className={inputClass}
            >
              <option value="FIXED">Cố định (phí hàng tháng)</option>
              <option value="METERED">Theo đồng hồ (số × đơn giá)</option>
              <option value="TIERED">Bậc thang (lũy tiến)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Đơn vị</label>
            <input
              id="service-unit"
              type="text"
              value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="kWh, m³, tháng..."
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            {form.chargeType === "FIXED" ? "Phí cố định (đ/tháng)" : "Đơn giá cơ bản (đ/đơn vị)"} *
          </label>
          <input
            id="service-price"
            type="number"
            value={form.basePrice ?? ""}
            onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
            required
            min={0}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <input
            id="service-mandatory"
            type="checkbox"
            checked={form.mandatory ?? false}
            onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
            className="w-4 h-4 text-brand-deep rounded border-slate-300"
          />
          <div>
            <label htmlFor="service-mandatory" className="text-sm font-medium text-slate-700 cursor-pointer">
              Dịch vụ bắt buộc
            </label>
            <p className="text-xs text-slate-400">Tự động áp dụng cho tất cả hợp đồng</p>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm dịch vụ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============ MAIN PAGE ============
export function ServiceListPage() {
  const [motels, setMotels] = useState<MotelResult[]>([]);
  const [selectedMotelId, setSelectedMotelId] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceResult | undefined>();

  useEffect(() => {
    motelService.list().then((r) => {
      setMotels(r.content);
      if (r.content.length > 0) setSelectedMotelId(r.content[0].id);
    });
  }, []);

  const fetchServices = useCallback(async () => {
    if (!selectedMotelId) return;
    setLoading(true);
    try {
      const result = await serviceService.list(selectedMotelId);
      setServices(result);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedMotelId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (svc: ServiceResult) => {
    if (!confirm(`Xóa dịch vụ "${svc.name}"?`)) return;
    try {
      await serviceService.delete(selectedMotelId!, svc.id);
      fetchServices();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const mandatoryServices = services.filter((s) => s.mandatory);
  const optionalServices = services.filter((s) => !s.mandatory);

  const selectClass = "h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/20 bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-ink">Dịch vụ & Tiện ích</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý các dịch vụ áp dụng cho phòng</p>
        </div>
        <div className="flex gap-2">
          <select
            id="service-motel-select"
            value={selectedMotelId ?? ""}
            onChange={(e) => setSelectedMotelId(Number(e.target.value))}
            className={selectClass}
          >
            {motels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <Button variant="outline" onClick={fetchServices} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            id="add-service-btn"
            onClick={() => { setEditingService(undefined); setIsFormOpen(true); }}
            disabled={!selectedMotelId}
          >
            <Plus size={16} className="mr-2" />
            Thêm dịch vụ
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Tổng dịch vụ", value: services.length, icon: Zap, bg: "bg-violet-100", color: "text-violet-600" },
          { label: "Bắt buộc", value: mandatoryServices.length, icon: Tag, bg: "bg-rose-100", color: "text-rose-600" },
          { label: "Tùy chọn", value: optionalServices.length, icon: Building2, bg: "bg-blue-100", color: "text-blue-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`p-3 ${item.bg} rounded-xl`}>
              <item.icon size={22} className={item.color} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <h3 className="text-2xl font-bold text-brand-ink mt-0.5">{item.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
          <Button size="sm" variant="outline" className="ml-auto" onClick={fetchServices}>Thử lại</Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
          <Zap size={40} className="text-slate-200 mb-4" />
          <h3 className="font-semibold text-slate-600 mb-1">Chưa có dịch vụ nào</h3>
          <p className="text-sm text-slate-400 mb-5">Thêm điện, nước, internet... để tự động tính phí hóa đơn</p>
          <Button onClick={() => { setEditingService(undefined); setIsFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Thêm dịch vụ đầu tiên
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mandatory */}
          {mandatoryServices.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Dịch vụ bắt buộc</h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mandatoryServices.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onEdit={() => { setEditingService(svc); setIsFormOpen(true); }}
                    onDelete={() => handleDelete(svc)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional */}
          {optionalServices.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Dịch vụ tùy chọn</h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {optionalServices.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onEdit={() => { setEditingService(svc); setIsFormOpen(true); }}
                    onDelete={() => handleDelete(svc)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ServiceFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => { setIsFormOpen(false); fetchServices(); }}
        motelId={selectedMotelId!}
        editing={editingService}
      />
    </div>
  );
}

// ============ SERVICE CARD ============
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: ServiceResult;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-brand-ink truncate">{service.name}</h3>
            {service.mandatory && (
              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full flex-shrink-0">Bắt buộc</span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${CHARGE_TYPE_COLOR[service.chargeType] ?? "bg-slate-100 text-slate-500"}`}>
            {CHARGE_TYPE_LABEL[service.chargeType] ?? service.chargeType}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-5">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Đơn giá</span>
          <span className="font-bold text-brand-deep text-base">
            {formatCurrency(service.basePrice ?? 0)}
            {service.unit && <span className="text-slate-400 font-normal text-xs">/{service.unit}</span>}
          </span>
        </div>
        {service.chargeType === "TIERED" && service.pricingTiers && service.pricingTiers.length > 0 && (
          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-2">
            {service.pricingTiers.length} bậc giá
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" size="sm" onClick={onEdit}>
          <Edit2 size={14} className="mr-1.5" />
          Cập nhật
        </Button>
        <Button
          variant="danger"
          className="w-9 px-0 flex items-center justify-center"
          size="sm"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

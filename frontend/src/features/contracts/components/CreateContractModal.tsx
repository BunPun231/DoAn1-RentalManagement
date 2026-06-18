import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { motelService, roomService, type MotelResult, type RoomResult } from "@/services/motelService";
import { serviceService, type ServiceResult } from "@/services/serviceService";
import { contractService } from "@/services/contractService";
import { extractError } from "@/lib/api";
import { Building2, UserCheck, ShieldCheck } from "lucide-react";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateContractModal({ isOpen, onClose, onSuccess }: CreateContractModalProps) {
  const [motels, setMotels] = useState<MotelResult[]>([]);
  const [selectedMotelId, setSelectedMotelId] = useState<number | "">("");
  const [rooms, setRooms] = useState<RoomResult[]>([]);
  const [services, setServices] = useState<ServiceResult[]>([]);
  
  // Form fields
  const [selectedRoomId, setSelectedRoomId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [billingDate, setBillingDate] = useState(""); // YYYY-MM-DD
  const [rentPrice, setRentPrice] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositStatus, setDepositStatus] = useState("UNPAID");
  
  // Resident fields
  const [fullName, setFullName] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Services fields
  const [selectedServices, setSelectedServices] = useState<Array<{ serviceId: number; quantity?: number }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load motels on open
  useEffect(() => {
    if (isOpen) {
      setError("");
      motelService.list(0, 100)
        .then((res) => {
          setMotels(res.content);
          if (res.content.length > 0) {
            setSelectedMotelId(res.content[0].id);
          }
        })
        .catch((err) => setError(extractError(err)));
    }
  }, [isOpen]);

  // Load rooms and services when selectedMotelId changes
  useEffect(() => {
    if (selectedMotelId) {
      // Load rooms
      roomService.list(Number(selectedMotelId))
        .then((res) => {
          // Filter only AVAILABLE or EMPTY rooms
          const availableRooms = res.content.filter(r => r.status === "AVAILABLE" || r.status === "EMPTY");
          setRooms(availableRooms);
          if (availableRooms.length > 0) {
            setSelectedRoomId(availableRooms[0].id);
            setRentPrice(availableRooms[0].basePrice.toString());
            setDepositAmount(availableRooms[0].basePrice.toString()); // default to 1 month rent
          } else {
            setSelectedRoomId("");
            setRentPrice("");
            setDepositAmount("");
          }
        })
        .catch((err) => setError(extractError(err)));

      // Load services
      serviceService.list(Number(selectedMotelId))
        .then((res) => {
          setServices(res);
          // Auto select mandatory services
          const mandatory = res.filter(s => s.mandatory).map(s => ({ serviceId: s.id, quantity: 1 }));
          setSelectedServices(mandatory);
        })
        .catch((err) => setError(extractError(err)));
    } else {
      setRooms([]);
      setServices([]);
      setSelectedRoomId("");
      setSelectedServices([]);
    }
  }, [selectedMotelId]);

  const handleRoomChange = (roomIdStr: string) => {
    const rId = Number(roomIdStr);
    setSelectedRoomId(rId);
    const room = rooms.find(r => r.id === rId);
    if (room) {
      setRentPrice(room.basePrice.toString());
      setDepositAmount(room.basePrice.toString());
    }
  };

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices((prev) => {
      const exists = prev.find(s => s.serviceId === serviceId);
      if (exists) {
        return prev.filter(s => s.serviceId !== serviceId);
      } else {
        return [...prev, { serviceId, quantity: 1 }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setError("Vui lòng chọn phòng trống");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      await contractService.create({
        roomId: Number(selectedRoomId),
        startDate,
        endDate,
        billingDate,
        rentPrice: parseFloat(rentPrice),
        depositAmount: parseFloat(depositAmount),
        depositStatus,
        primaryResidentFullName: fullName,
        primaryResidentPhone: phone,
        primaryResidentEmail: email || undefined,
        primaryResidentIdCardNumber: idCardNumber,
        serviceItems: selectedServices,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all bg-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo hợp đồng mới" size="lg">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-h-[75vh] overflow-y-auto pr-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
      >
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Section 1: Room Info & Duration */}
        <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <h3 className="font-bold text-brand-ink text-sm flex items-center gap-2 pb-2 border-b border-slate-200">
            <Building2 className="h-4 w-4 text-brand-deep" />
            1. Thông tin phòng & Thời hạn hợp đồng
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-700">Khu trọ *</label>
              <select
                value={selectedMotelId}
                onChange={(e) => setSelectedMotelId(Number(e.target.value))}
                className={inputClass}
                required
              >
                {motels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-700">Phòng trống *</label>
              <select
                value={selectedRoomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className={inputClass}
                required
              >
                {rooms.length === 0 ? (
                  <option value="">(Không có phòng trống)</option>
                ) : (
                  rooms.map((r) => (
                    <option key={r.id} value={r.id}>P.{r.roomNumber}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Ngày bắt đầu *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input label="Ngày kết thúc *" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            <Input label="Ngày chốt tiền hàng tháng *" type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Tiền thuê/tháng (đ) *" type="number" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} required />
            <Input label="Tiền cọc (đ) *" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required />
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-700">Trạng thái đóng cọc *</label>
              <select
                value={depositStatus}
                onChange={(e) => setDepositStatus(e.target.value)}
                className={inputClass}
                required
              >
                <option value="UNPAID">Chưa đóng</option>
                <option value="PAID">Đã đóng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Resident Representative Info */}
        <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <h3 className="font-bold text-brand-ink text-sm flex items-center gap-2 pb-2 border-b border-slate-200">
            <UserCheck className="h-4 w-4 text-brand-deep" />
            2. Thông tin người đại diện hợp đồng
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Họ và tên đại diện *" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="VD: Nguyễn Văn A" required />
            <Input label="Số CCCD/CMND *" value={idCardNumber} onChange={(e) => setIdCardNumber(e.target.value)} placeholder="012345678901" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Số điện thoại *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" required />
            <Input label="Email (Tùy chọn)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a@example.com" />
          </div>
        </div>

        {/* Section 3: Registered Services */}
        {services.length > 0 && (
          <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-brand-ink text-sm flex items-center gap-2 pb-2 border-b border-slate-200">
              <ShieldCheck className="h-4 w-4 text-brand-deep" />
              3. Dịch vụ đăng ký đi kèm phòng
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2 bg-white rounded-xl border border-slate-200">
              {services.map((s) => {
                const isChecked = !!selectedServices.find(item => item.serviceId === s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 hover:border-slate-200">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleServiceToggle(s.id)}
                      className="w-4 h-4 text-brand-deep rounded border-slate-300 focus:ring-brand-deep/30"
                    />
                    <span className="truncate font-medium">{s.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Đang tạo..." : "Tạo hợp đồng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

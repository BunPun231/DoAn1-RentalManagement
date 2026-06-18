import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { roomService } from "@/services/motelService";
import { extractError } from "@/lib/api";

interface BulkAddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  motelId: number;
}

interface RoomPreviewItem {
  floor: number;
  roomNumber: string;
  area?: number;
  basePrice: number;
  status: "idle" | "loading" | "success" | "error";
  errorMsg?: string;
}

export function BulkAddRoomModal({ isOpen, onClose, onSuccess, motelId }: BulkAddRoomModalProps) {
  const [fromFloor, setFromFloor] = useState("1");
  const [toFloor, setToFloor] = useState("1");
  const [roomsPerFloor, setRoomsPerFloor] = useState("5");
  const [area, setArea] = useState("");
  const [basePrice, setBasePrice] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [creationResults, setCreationResults] = useState<RoomPreviewItem[]>([]);
  const [globalError, setGlobalError] = useState("");

  const previewRooms = useMemo(() => {
    const list: RoomPreviewItem[] = [];
    const start = parseInt(fromFloor, 10);
    const end = parseInt(toFloor, 10);
    const count = parseInt(roomsPerFloor, 10);
    const priceVal = parseFloat(basePrice) || 0;
    const areaVal = area ? parseFloat(area) : undefined;

    if (isNaN(start) || isNaN(end) || isNaN(count) || start <= 0 || end < start || count <= 0) {
      return [];
    }

    for (let f = start; f <= end; f++) {
      for (let r = 1; r <= count; r++) {
        const roomNumber = `P${f}${String(r).padStart(2, "0")}`;
        list.push({
          floor: f,
          roomNumber,
          area: areaVal,
          basePrice: priceVal,
          status: "idle"
        });
      }
    }
    return list;
  }, [fromFloor, toFloor, roomsPerFloor, area, basePrice]);

  const handleBulkCreate = async () => {
    setGlobalError("");
    setIsCreating(true);
    
    const roomsToCreate = [...previewRooms];
    setCreationResults(roomsToCreate.map(r => ({ ...r, status: "idle" })));

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < roomsToCreate.length; i++) {
      const room = roomsToCreate[i];
      setProgressText(`Đang tạo phòng ${room.roomNumber} (tầng ${room.floor})...`);
      
      // Update status to loading
      setCreationResults(prev => {
        const next = [...prev];
        next[i] = { ...next[i], status: "loading" };
        return next;
      });

      try {
        await roomService.create(motelId, {
          roomNumber: room.roomNumber,
          floor: room.floor,
          area: room.area,
          basePrice: room.basePrice,
        });
        
        successCount++;
        setCreationResults(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "success" };
          return next;
        });
      } catch (err) {
        failureCount++;
        const errorMsg = extractError(err);
        setCreationResults(prev => {
          const next = [...prev];
          next[i] = { ...next[i], status: "error", errorMsg };
          return next;
        });
      }
    }

    setIsCreating(false);
    setProgressText(`Hoàn thành! Đã tạo thành công ${successCount} phòng, thất bại ${failureCount} phòng.`);
    
    if (successCount > 0 && onSuccess) {
      onSuccess();
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo phòng hàng loạt">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {globalError && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Từ tầng *</label>
            <input
              type="number"
              value={fromFloor}
              onChange={(e) => setFromFloor(e.target.value)}
              min={1}
              required
              disabled={isCreating}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Đến tầng *</label>
            <input
              type="number"
              value={toFloor}
              onChange={(e) => setToFloor(e.target.value)}
              min={1}
              required
              disabled={isCreating}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Số phòng/tầng *</label>
            <input
              type="number"
              value={roomsPerFloor}
              onChange={(e) => setRoomsPerFloor(e.target.value)}
              min={1}
              required
              disabled={isCreating}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Diện tích mặc định (m²)</label>
            <input
              type="number"
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="VD: 25"
              disabled={isCreating}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Giá thuê mặc định (đ) *</label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              min={0}
              placeholder="VD: 3000000"
              required
              disabled={isCreating}
              className={inputClass}
            />
          </div>
        </div>

        {/* Progress or Preview section */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-700">
              Danh sách phòng sẽ tạo ({previewRooms.length} phòng)
            </h4>
            {progressText && (
              <span className="text-xs font-medium text-brand-deep">{progressText}</span>
            )}
          </div>

          <div className="border border-slate-100 rounded-xl bg-slate-50 p-3 max-h-48 overflow-y-auto space-y-1.5 text-xs text-slate-600">
            {creationResults.length > 0 ? (
              creationResults.map((room, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/50 last:border-0">
                  <span>
                    Phòng <strong>{room.roomNumber}</strong> (Tầng {room.floor}) - {room.area || "?"}m² - {room.basePrice.toLocaleString()}đ
                  </span>
                  <span>
                    {room.status === "idle" && <span className="text-slate-400">Chờ tạo</span>}
                    {room.status === "loading" && <span className="text-blue-500 font-semibold animate-pulse">Đang tạo...</span>}
                    {room.status === "success" && <span className="text-emerald-600 font-semibold">✓ Thành công</span>}
                    {room.status === "error" && <span className="text-red-500 font-semibold" title={room.errorMsg}>✗ Lỗi</span>}
                  </span>
                </div>
              ))
            ) : previewRooms.length > 0 ? (
              previewRooms.map((room, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200/50 last:border-0">
                  <span>
                    Phòng <strong>{room.roomNumber}</strong> (Tầng {room.floor}) - {room.area || "?"}m² - {room.basePrice.toLocaleString()}đ
                  </span>
                  <span className="text-slate-400">Sẵn sàng</span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-4">Nhập thông tin tầng và số phòng hợp lệ để xem trước</div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            {creationResults.length > 0 ? "Đóng" : "Hủy"}
          </Button>
          <Button
            onClick={handleBulkCreate}
            disabled={isCreating || previewRooms.length === 0}
          >
            {isCreating ? "Đang xử lý..." : "Tạo hàng loạt"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

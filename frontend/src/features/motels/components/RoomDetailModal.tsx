import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Room } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
}

export function RoomDetailModal({ isOpen, onClose, room }: RoomDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết phòng - ${room.name}`} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-500">Trạng thái:</span>
            <select 
              className="text-sm font-medium rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-deep"
              defaultValue={room.status}
            >
              <option value="AVAILABLE">Trống</option>
              <option value="RENTED">Đang thuê</option>
              <option value="MAINTENANCE">Đang sửa chữa</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "Hủy sửa" : "Chỉnh sửa thông tin"}
          </Button>
        </div>

        {isEditing ? (
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tên phòng" defaultValue={room.name} />
              <Input label="Tầng" type="number" defaultValue={room.floor} />
              <Input label="Diện tích (m²)" type="number" defaultValue={room.area} />
              <Input label="Giá thuê/tháng" type="number" defaultValue={room.price} />
              <Input label="Số người ở tối đa" type="number" defaultValue={room.maxTenants} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => setIsEditing(false)}>Lưu thay đổi</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Tầng</p>
              <p className="font-medium text-slate-900">{room.floor}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Diện tích</p>
              <p className="font-medium text-slate-900">{room.area} m²</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Giá thuê</p>
              <p className="font-medium text-brand-deep">{formatCurrency(room.price)}/tháng</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Số người tối đa</p>
              <p className="font-medium text-slate-900">{room.maxTenants || 2} người</p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100">
          <h3 className="font-semibold text-brand-ink mb-4">Khách đang thuê</h3>
          {room.status === "RENTED" ? (
            <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200">
              <div>
                <p className="font-medium text-brand-ink">Trần Thị B</p>
                <p className="text-sm text-slate-500">0907654321</p>
              </div>
              <Button variant="outline" size="sm">Xem hồ sơ</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Phòng đang trống</p>
          )}
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex justify-between">
          <Button variant="danger" size="sm">Xóa phòng</Button>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Modal>
  );
}

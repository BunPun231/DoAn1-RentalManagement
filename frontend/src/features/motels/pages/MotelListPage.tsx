import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { mockMotels, mockRooms } from "@/data/mock";
import { AddMotelModal } from "../components/AddMotelModal";
import { RoomDetailModal } from "../components/RoomDetailModal";
import { Room } from "@/types";

export function MotelListPage() {
  const [selectedMotel, setSelectedMotel] = useState(mockMotels[0]?.id);
  const [isAddMotelOpen, setIsAddMotelOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const activeMotel = mockMotels.find(m => m.id === selectedMotel);
  const rooms = mockRooms.filter(r => r.motelId === selectedMotel);

  // Group rooms by floor
  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Quản lý Khu trọ & Phòng</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddMotelOpen(true)} variant="outline">
            <Plus size={16} className="mr-2" />
            Thêm khu trọ
          </Button>
          <Button>
            <Plus size={16} className="mr-2" />
            Thêm phòng mới
          </Button>
        </div>
      </div>

      {/* Motel Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {mockMotels.map(motel => (
          <button
            key={motel.id}
            onClick={() => setSelectedMotel(motel.id)}
            className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
              selectedMotel === motel.id 
                ? "bg-brand-deep text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {motel.name}
          </button>
        ))}
      </div>

      {/* Active Motel Details & Room Grid */}
      {activeMotel && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-brand-ink">{activeMotel.name}</h2>
              <p className="text-sm text-slate-500">{activeMotel.address}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit2 size={14} className="mr-2" /> Cập nhật
              </Button>
              <Button variant="danger" size="sm">
                <Trash2 size={14} className="mr-2" /> Xóa
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {floors.map(floor => (
              <div key={floor} className="space-y-3">
                <h3 className="font-semibold text-slate-700">Tầng {floor}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.filter(r => r.floor === floor).map(room => (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className="cursor-pointer bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-deep transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-brand-ink text-lg">{room.name}</span>
                        <Badge 
                          variant={room.status === "RENTED" ? "success" : room.status === "AVAILABLE" ? "default" : "warning"}
                        >
                          {room.status === "RENTED" ? "Đang thuê" : room.status === "AVAILABLE" ? "Trống" : "Sửa chữa"}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 space-y-1">
                        <p>{room.area} m²</p>
                        <p className="font-medium text-brand-deep">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.price)}/tháng
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddMotelModal 
        isOpen={isAddMotelOpen} 
        onClose={() => setIsAddMotelOpen(false)} 
      />

      {selectedRoom && (
        <RoomDetailModal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          room={selectedRoom}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateContractModal({ isOpen, onClose }: CreateContractModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo hợp đồng mới" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-brand-ink border-b border-slate-100 pb-2">Thông tin phòng & Thời hạn</h3>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-slate-700">Chọn phòng</label>
              <select className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep">
                <option value="">Chọn khu trọ và phòng...</option>
                <option value="r2">Hoàng Hoa Thám - P102</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ngày bắt đầu" type="date" required />
              <Input label="Ngày kết thúc" type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tiền thuê/tháng" type="number" required />
              <Input label="Tiền cọc" type="number" required />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-brand-ink border-b border-slate-100 pb-2">Thông tin người đại diện</h3>
            <Input label="Họ và tên" required />
            <Input label="CCCD/CMND" required />
            <Input label="Số điện thoại" required />
            <Input label="Email (Tùy chọn)" type="email" />
          </div>
        </div>
        
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

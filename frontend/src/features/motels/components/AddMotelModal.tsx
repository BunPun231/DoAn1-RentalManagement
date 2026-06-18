import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface AddMotelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMotelModal({ isOpen, onClose }: AddMotelModalProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm khu trọ mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Tên khu trọ" placeholder="VD: Khu trọ Hoàng Hoa Thám" required />
        <Input label="Địa chỉ" placeholder="Số nhà, tên đường, phường, quận" required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Số tầng" type="number" min={1} defaultValue={1} required />
          <Input label="Mã định danh (Prefix)" placeholder="VD: HHT" />
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Đang lưu..." : "Thêm khu trọ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { mockServices } from "@/data/mock";
import { formatCurrency } from "@/lib/utils";
import { AddServiceModal } from "../components/AddServiceModal";

export function ServiceListPage() {
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Dịch vụ & Tiện ích</h1>
        <Button onClick={() => setIsAddServiceOpen(true)}>
          <Plus size={16} className="mr-2" />
          Thêm dịch vụ mới
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockServices.map((service) => (
          <div key={service.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-brand-ink">{service.name}</h3>
                <p className="text-sm text-slate-500">{service.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={service.isActive} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-deep"></div>
              </label>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mb-6">
              <div className="flex justify-between">
                <span>Đơn giá:</span>
                <span className="font-medium text-brand-ink">{formatCurrency(service.price)} / {service.unit}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Edit2 size={16} className="mr-2" /> Cập nhật
              </Button>
              <Button variant="danger" className="w-10 px-0 flex items-center justify-center">
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddServiceModal 
        isOpen={isAddServiceOpen} 
        onClose={() => setIsAddServiceOpen(false)} 
      />
    </div>
  );
}

import { Building2, Users, FileText, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Tổng quan hệ thống</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tổng doanh thu dự kiến</p>
              <h3 className="text-2xl font-bold text-brand-ink mt-1">{formatCurrency(45000000)}</h3>
            </div>
            <div className="p-3 bg-brand-deep/10 rounded-lg text-brand-deep">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+5.2%</span>
            <span className="text-slate-500 ml-2">so với tháng trước</span>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tỷ lệ lấp đầy</p>
              <h3 className="text-2xl font-bold text-brand-ink mt-1">85%</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-lg text-green-700">
              <Building2 size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">17/20 phòng đang thuê</span>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hợp đồng sắp hết hạn</p>
              <h3 className="text-2xl font-bold text-brand-ink mt-1">3</h3>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-700">
              <FileText size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-yellow-600">
            <AlertCircle size={16} className="mr-1" />
            <span>Cần gia hạn trong 30 ngày tới</span>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Khách thuê mới</p>
              <h3 className="text-2xl font-bold text-brand-ink mt-1">12</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+2</span>
            <span className="text-slate-500 ml-2">trong tháng này</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts / Action required */}
        <div className="rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-brand-ink">Cần xử lý</h2>
          </div>
          <div className="p-5 flex-1">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-yellow-800">5 hóa đơn chưa thanh toán</h4>
                  <p className="text-sm text-yellow-700 mt-1">Tổng nợ: {formatCurrency(12500000)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-blue-800">Chưa chốt điện nước tháng này</h4>
                  <p className="text-sm text-blue-700 mt-1">20/20 phòng chưa ghi chỉ số</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activities */}
        <div className="rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-brand-ink">Hoạt động gần đây</h2>
          </div>
          <div className="p-5 flex-1">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== 3 && <div className="absolute left-2 top-6 bottom-[-24px] w-px bg-slate-200"></div>}
                  <div className="relative z-10 w-4 h-4 rounded-full bg-brand-deep/20 border-2 border-white mt-1"></div>
                  <div>
                    <p className="text-sm font-medium text-brand-ink">Thanh toán hóa đơn P10{i}</p>
                    <p className="text-xs text-slate-500 mt-1">Hôm nay, 10:23 AM</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

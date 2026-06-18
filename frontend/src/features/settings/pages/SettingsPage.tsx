import { useState } from "react";
import { Save, Shield, Bell, CreditCard, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Cấu hình hệ thống</h1>
        <Button>
          <Save size={16} className="mr-2" />
          Lưu thay đổi
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "general" ? "bg-white text-brand-deep shadow-sm border border-slate-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Building size={18} />
            Thông tin chung
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "security" ? "bg-white text-brand-deep shadow-sm border border-slate-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Shield size={18} />
            Bảo mật
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "notifications" ? "bg-white text-brand-deep shadow-sm border border-slate-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Bell size={18} />
            Thông báo
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "billing" ? "bg-white text-brand-deep shadow-sm border border-slate-200" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard size={18} />
            Thanh toán & Gói cước
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {activeTab === "general" && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-lg font-bold text-brand-ink border-b border-slate-100 pb-2">Thông tin doanh nghiệp / cá nhân</h2>
              <div className="grid gap-4">
                <Input label="Tên doanh nghiệp / Chủ trọ" defaultValue="Smart Boarding House" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Số điện thoại liên hệ" defaultValue="0901234567" />
                  <Input label="Email liên hệ" defaultValue="admin@smartboarding.com" />
                </div>
                <Input label="Địa chỉ văn phòng" defaultValue="123 Nguyễn Văn Linh, Quận 7, TP.HCM" />
              </div>

              <h2 className="text-lg font-bold text-brand-ink border-b border-slate-100 pb-2 mt-8">Cấu hình mẫu hợp đồng mặc định</h2>
              <div className="space-y-4">
                <Input label="Tiền cọc mặc định (tháng)" type="number" defaultValue={1} />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-medium text-slate-700">Quy định về việc trả phòng</label>
                  <textarea 
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-deep focus:outline-none"
                    rows={4}
                    defaultValue={"- Báo trước 30 ngày\n- Hoàn trả 100% tiền cọc nếu thực hiện đúng hợp đồng\n- Phạt 100% tiền cọc nếu vi phạm"}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-lg font-bold text-brand-ink border-b border-slate-100 pb-2">Đổi mật khẩu</h2>
              <div className="space-y-4">
                <Input label="Mật khẩu hiện tại" type="password" />
                <Input label="Mật khẩu mới" type="password" />
                <Input label="Xác nhận mật khẩu mới" type="password" />
                <Button>Cập nhật mật khẩu</Button>
              </div>

              <h2 className="text-lg font-bold text-brand-ink border-b border-slate-100 pb-2 mt-8">Xác thực 2 bước (2FA)</h2>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="font-medium text-slate-900">Trạng thái: Đã tắt</p>
                  <p className="text-sm text-slate-500 mt-1">Bật 2FA để tăng cường bảo mật cho tài khoản.</p>
                </div>
                <Button variant="outline">Kích hoạt 2FA</Button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-lg font-bold text-brand-ink border-b border-slate-100 pb-2">Thông báo Email</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 text-brand-deep rounded border-slate-300" defaultChecked />
                  <span className="text-slate-700">Nhận thông báo khi có khách thuê mới đăng ký</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 text-brand-deep rounded border-slate-300" defaultChecked />
                  <span className="text-slate-700">Nhận thông báo khi có hóa đơn quá hạn</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 text-brand-deep rounded border-slate-300" defaultChecked />
                  <span className="text-slate-700">Nhận báo cáo tổng kết hàng tháng</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-6 bg-brand-deep/5 rounded-xl border border-brand-deep/20 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-brand-deep">Gói Professional</h3>
                  <p className="text-sm text-slate-600 mt-1">Quản lý tối đa 500 phòng</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-ink">500.000đ<span className="text-sm text-slate-500 font-normal">/tháng</span></p>
                  <p className="text-xs text-slate-500 mt-1">Gia hạn: 23/06/2026</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">Nâng cấp gói cước</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

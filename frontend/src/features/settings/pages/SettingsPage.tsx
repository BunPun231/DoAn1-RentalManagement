import { useState } from "react";
import { Save, Shield, Bell, CreditCard, Building, User, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { extractError } from "@/lib/api";

// ============ CHANGE PASSWORD SECTION ============
function ChangePasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch = form.newPassword === form.confirmPassword;
  const isStrong = form.newPassword.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError("Mật khẩu mới không khớp"); return; }
    if (!isStrong) { setError("Mật khẩu mới phải có ít nhất 8 ký tự"); return; }
    setError("");
    setLoading(true);
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all pr-12";

  const PwdField = ({
    id, label, field, value, placeholder,
  }: { id: string; label: string; field: "current" | "new" | "confirm"; value: string; placeholder: string }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={showPwd[field] ? "text" : "password"}
          value={value}
          onChange={(e) => setForm({ ...form, [field === "current" ? "currentPassword" : field === "new" ? "newPassword" : "confirmPassword"]: e.target.value })}
          placeholder={placeholder}
          required
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShowPwd({ ...showPwd, [field]: !showPwd[field] })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {showPwd[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-base font-bold text-brand-ink border-b border-slate-100 pb-3">Đổi mật khẩu (UC05)</h2>

      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-700">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">Mật khẩu đã được cập nhật thành công!</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PwdField id="pwd-current" label="Mật khẩu hiện tại *" field="current" value={form.currentPassword} placeholder="Nhập mật khẩu hiện tại" />
        <PwdField id="pwd-new" label="Mật khẩu mới *" field="new" value={form.newPassword} placeholder="Tối thiểu 8 ký tự" />
        {form.newPassword && (
          <div className="flex items-center gap-2">
            <div className={`h-1 flex-1 rounded-full ${isStrong ? "bg-emerald-400" : "bg-red-300"}`} />
            <span className={`text-xs ${isStrong ? "text-emerald-600" : "text-red-500"}`}>
              {isStrong ? "Đủ mạnh" : "Quá ngắn"}
            </span>
          </div>
        )}
        <PwdField id="pwd-confirm" label="Xác nhận mật khẩu mới *" field="confirm" value={form.confirmPassword} placeholder="Nhập lại mật khẩu mới" />
        {form.confirmPassword && !passwordsMatch && (
          <p className="text-xs text-red-500">Mật khẩu không khớp</p>
        )}
        <Button
          id="change-password-submit"
          type="submit"
          disabled={loading || !passwordsMatch || !isStrong}
        >
          {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </Button>
      </form>
    </div>
  );
}

// ============ MAIN SETTINGS PAGE ============
const TABS = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "billing", label: "Gói cước", icon: CreditCard },
] as const;

type TabId = "profile" | "security" | "notifications" | "billing";

export function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";
  const areaClass = `${inputClass} resize-none`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-ink">Cài đặt</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý tài khoản và cấu hình hệ thống</p>
        </div>
        {activeTab !== "security" && (
          <Button onClick={handleSave} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-56 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-deep shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-base font-bold text-brand-ink border-b border-slate-100 pb-3">Thông tin cá nhân</h2>
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-deep flex items-center justify-center text-white font-bold text-2xl">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="font-semibold text-brand-ink">{user?.name}</p>
                  <p className="text-sm text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                  <input id="profile-name" type="text" defaultValue={user?.name} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                    <input id="profile-phone" type="tel" defaultValue={user?.phone} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input id="profile-email" type="email" defaultValue={user?.email} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-brand-ink mb-4">Cấu hình hợp đồng mặc định</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Tiền cọc mặc định (tháng)</label>
                    <input id="profile-deposit" type="number" defaultValue={1} min={1} max={6} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Quy định trả phòng</label>
                    <textarea
                      id="profile-policy"
                      rows={3}
                      defaultValue="- Báo trước 30 ngày&#10;- Hoàn 100% tiền cọc nếu không vi phạm&#10;- Phạt 100% tiền cọc nếu vi phạm hợp đồng"
                      className={areaClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-8">
              <ChangePasswordSection />

              <div className="max-w-lg border-t border-slate-100 pt-6">
                <h2 className="text-base font-bold text-brand-ink pb-3">Phiên đăng nhập</h2>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">Thiết bị hiện tại</p>
                    <p className="text-xs text-slate-500 mt-0.5">Trình duyệt web • Đăng nhập gần đây</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">Đang hoạt động</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-base font-bold text-brand-ink border-b border-slate-100 pb-3">Thông báo Email</h2>
              <div className="space-y-4">
                {[
                  { id: "notif-new-tenant", label: "Khách thuê đăng ký mới", desc: "Nhận thông báo khi có người đăng ký qua link" },
                  { id: "notif-overdue", label: "Hóa đơn quá hạn", desc: "Nhắc nhở khi khách thuê chưa thanh toán" },
                  { id: "notif-expiring", label: "Hợp đồng sắp hết hạn", desc: "Nhắc nhở 30 ngày trước khi hợp đồng hết hạn" },
                  { id: "notif-monthly", label: "Báo cáo tổng kết tháng", desc: "Gửi báo cáo doanh thu vào ngày đầu tháng" },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      id={item.id}
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-brand-deep rounded border-slate-300 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-base font-bold text-brand-ink border-b border-slate-100 pb-3">Gói dịch vụ hiện tại</h2>
              <div className="rounded-2xl bg-gradient-to-br from-brand-deep to-slate-800 p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Gói Professional</h3>
                    <p className="text-white/70 text-sm mt-1">Quản lý tối đa 500 phòng</p>
                  </div>
                  <span className="bg-emerald-400 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full">ACTIVE</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">500.000đ</span>
                  <span className="text-white/60">/tháng</span>
                </div>
                <p className="text-white/60 text-xs">Gia hạn tự động: 23/06/2026</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-600">Quyền lợi của gói:</p>
                {[
                  "Quản lý tối đa 500 phòng",
                  "Xuất báo cáo PDF không giới hạn",
                  "Hỗ trợ kỹ thuật ưu tiên 24/7",
                  "Tích hợp cổng thanh toán tự động",
                  "Lưu trữ dữ liệu không giới hạn",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">Xem thêm gói cước</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

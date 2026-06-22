import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { motelService, type MotelResult } from "@/services/motelService";
import { extractError } from "@/lib/api";
import {
  Copy, Check, ChevronLeft, ChevronRight, HelpCircle, ShieldCheck, ChevronUp, ChevronDown
} from "lucide-react";

import accessWebhookImg from "../../../../image/AccessWebhook.png";
import step1AddWebhookImg from "../../../../image/Step1-AddWebhook.png";
import step2AddWebhookImg from "../../../../image/Step2-AddWebhook.png";
import step3AddWebhookImg from "../../../../image/Step3-AddWebhook.png";
import step4AddWebhookImg from "../../../../image/Step4-AddWebhook.png";

interface AddMotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  motel?: MotelResult;
}

const GUIDE_STEPS = [
  {
    title: "Vào quản lý Webhook",
    desc: "Đăng nhập vào SePay.vn, vào mục 'Tích hợp' -> chọn 'Webhooks' ở menu bên trái.",
    img: accessWebhookImg
  },
  {
    title: "Tạo cấu hình Webhook mới",
    desc: "Bấm vào nút 'Thêm Webhook' ở góc phải màn hình để mở hộp thoại thêm mới.",
    img: step1AddWebhookImg
  },
  {
    title: "Nhập đường dẫn Webhook",
    desc: "Dán đường dẫn Webhook URL đã sao chép từ phần mềm của bác vào ô 'Địa chỉ url nhận dữ liệu' và chọn các sự kiện giao dịch.",
    img: step2AddWebhookImg
  },
  {
    title: "Điền Secret Key bảo mật",
    desc: "Sao chép Secret Key ở trên dán vào ô 'Chữ ký bảo mật (Signature Secret Key)' để đảm bảo truyền tin an toàn theo chuẩn HMAC-SHA256.",
    img: step3AddWebhookImg
  },
  {
    title: "Lưu & Kích hoạt Webhook",
    desc: "Bấm 'Lưu lại' trên SePay.vn. Trạng thái Webhook hiển thị hoạt động là đã thành công kết nối bảo mật!",
    img: step4AddWebhookImg
  }
];

export function AddMotelModal({ isOpen, onClose, onSuccess, motel }: AddMotelModalProps) {
  const [name, setName] = useState(motel?.name ?? "");
  const [address, setAddress] = useState(motel?.address ?? "");
  const [totalFloors, setTotalFloors] = useState(motel?.totalFloors?.toString() ?? "1");
  const [description, setDescription] = useState(motel?.description ?? "");
  const [closingDay, setClosingDay] = useState("5");
  const [depositRate, setDepositRate] = useState("100");
  const [bankId, setBankId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [secretKey, setSecretKey] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Webhook Guide states
  const [copied, setCopied] = useState<"url" | "key" | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  useEffect(() => {
    if (motel) {
      setName(motel.name);
      setAddress(motel.address);
      setTotalFloors(motel.totalFloors.toString());
      setDescription(motel.description ?? "");
      setClosingDay(motel.billingCycleDay !== undefined && motel.billingCycleDay !== null ? motel.billingCycleDay.toString() : "last");
      setDepositRate(motel.depositPercent !== undefined && motel.depositPercent !== null ? motel.depositPercent.toString() : "100");
      if (motel.bankConfig) {
        try {
          const cfg = JSON.parse(motel.bankConfig);
          setBankId(cfg.bankId || "");
          setBankAccount(cfg.bankAccount || "");
          setAccountHolder(cfg.accountHolder || "");
          setBankName(cfg.bankName || "");
          setSecretKey(cfg.secretKey || "");
        } catch (e) {
          console.error("Failed to parse bank config", e);
        }
      } else {
        setBankId("");
        setBankAccount("");
        setAccountHolder("");
        setBankName("");
        setSecretKey("");
      }
    } else {
      setName("");
      setAddress("");
      setTotalFloors("1");
      setDescription("");
      setClosingDay("5");
      setDepositRate("100");
      setBankId("");
      setBankAccount("");
      setAccountHolder("");
      setBankName("");
      setSecretKey("");
    }
    setError("");
    setCopied(null);
    setShowGuide(false);
    setGuideStep(1);
  }, [motel, isOpen]);

  const handleCopy = (text: string, type: "url" | "key") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      let existingConfigObj: any = {};
      if (motel && motel.bankConfig) {
        try {
          existingConfigObj = JSON.parse(motel.bankConfig);
        } catch (err) {
          console.error(err);
        }
      }

      const bankConfigObj = {
        ...existingConfigObj,
        bankId,
        bankAccount: bankAccount.trim(),
        accountHolder: accountHolder.trim(),
        bankName,
      };

      const payload = {
        name: name.trim(),
        address: address.trim(),
        totalFloors: parseInt(totalFloors, 10),
        description: description.trim() || undefined,
        billingCycleDay: closingDay === "last" ? undefined : parseInt(closingDay, 10),
        depositPercent: parseFloat(depositRate) || 0,
        bankConfig: bankId && bankAccount && accountHolder ? JSON.stringify(bankConfigObj) : undefined,
      };

      let savedMotel;
      if (motel) {
        savedMotel = await motelService.update(motel.id, payload);
      } else {
        savedMotel = await motelService.create(payload);
      }
      
      localStorage.setItem(`motel_settings_${savedMotel.id}`, JSON.stringify({
        paymentCycle: 1,
        closingDay: closingDay === "last" ? 30 : parseInt(closingDay, 10),
        depositRate: parseFloat(depositRate),
      }));

      onSuccess?.();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep/30 focus:border-brand-deep transition-all";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={motel ? "Cập nhật khu trọ" : "Thêm khu trọ mới"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Tên khu trọ *</label>
          <input
            id="motel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Khu trọ Hoàng Hoa Thám"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Địa chỉ *</label>
          <input
            id="motel-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số nhà, tên đường, phường, quận, thành phố"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Số tầng *</label>
          <input
            id="motel-floors"
            type="number"
            value={totalFloors}
            onChange={(e) => setTotalFloors(e.target.value)}
            min={1}
            max={50}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Ngày chốt kỳ *</label>
            <select
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              className={inputClass}
              required
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d.toString()}>Ngày {d} hàng tháng</option>
              ))}
              <option value="last">Ngày cuối tháng</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tỷ lệ tiền cọc (%) *</label>
            <input
              type="number"
              value={depositRate}
              onChange={(e) => setDepositRate(e.target.value)}
              min={0}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
          <h4 className="font-semibold text-sm text-slate-800 font-sans">Cấu hình tài khoản nhận tiền (VietQR)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Ngân hàng</label>
              <select
                value={bankId}
                onChange={(e) => {
                  setBankId(e.target.value);
                  const bankNames: Record<string, string> = {
                    MB: "MBBank",
                    VCB: "Vietcombank",
                    ICB: "VietinBank",
                    ACB: "ACB",
                    BIDV: "BIDV",
                    TCB: "Techcombank",
                    VIB: "VIB",
                  };
                  setBankName(bankNames[e.target.value] || e.target.value);
                }}
                className={inputClass}
              >
                <option value="">Chọn ngân hàng</option>
                <option value="MB">MB Bank (Quân Đội)</option>
                <option value="VCB">Vietcombank</option>
                <option value="ICB">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="BIDV">BIDV</option>
                <option value="TCB">Techcombank</option>
                <option value="VIB">VIB</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Số tài khoản</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="VD: 190304567899"
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1 font-sans">
            <label className="text-xs font-medium text-slate-600">Tên chủ tài khoản (Không dấu)</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN TRAN PHUONG"
              className={inputClass}
            />
          </div>
        </div>

        {motel && (
          <div className="rounded-2xl border border-blue-150 p-4 bg-blue-50/20 space-y-4 font-sans">
            <div className="flex items-center gap-2 text-blue-700">
              <ShieldCheck size={18} />
              <h4 className="font-bold text-sm">Tích hợp Webhook SePay.vn (HMAC-SHA256)</h4>
            </div>

            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Đường dẫn Webhook (Webhook URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/v1/payments/webhook`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono select-all focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`${window.location.origin}/api/v1/payments/webhook`, "url")}
                    className="text-xs shrink-0 flex items-center gap-1 font-bold"
                  >
                    {copied === "url" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copied === "url" ? "Đã chép" : "Sao chép"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Mã ký xác thực (Secret Key)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={secretKey}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono select-all focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(secretKey, "key")}
                    className="text-xs shrink-0 flex items-center gap-1 font-bold"
                  >
                    {copied === "key" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copied === "key" ? "Đã chép" : "Sao chép"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Expander for step-by-step images */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  Xem ảnh hướng dẫn cấu hình chi tiết trên SePay.vn
                </span>
                {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showGuide && (
                <div className="mt-3 bg-white border border-slate-150 rounded-xl p-4 space-y-3 animate-fade-in text-left">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Bước {guideStep}/5: {GUIDE_STEPS[guideStep - 1].title}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={guideStep === 1}
                        onClick={() => setGuideStep(prev => prev - 1)}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={guideStep === 5}
                        onClick={() => setGuideStep(prev => prev + 1)}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-650 leading-relaxed font-sans font-normal">
                    {GUIDE_STEPS[guideStep - 1].desc}
                  </p>

                  <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-2 min-h-[180px]">
                    <img
                      src={GUIDE_STEPS[guideStep - 1].img}
                      alt="Instruction guide"
                      className="max-h-[220px] object-contain rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Ghi chú</label>
          <textarea
            id="motel-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thông tin thêm về khu trọ (tùy chọn)"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Đang lưu..." : (motel ? "Cập nhật" : "Thêm khu trọ")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

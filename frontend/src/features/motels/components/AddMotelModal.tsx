import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { motelService, type MotelResult } from "@/services/motelService";
import { extractError } from "@/lib/api";

interface AddMotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  motel?: MotelResult;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        } catch (e) {
          console.error("Failed to parse bank config", e);
        }
      } else {
        setBankId("");
        setBankAccount("");
        setAccountHolder("");
        setBankName("");
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
    }
    setError("");
  }, [motel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const bankConfigObj = {
        bankId,
        bankAccount,
        accountHolder,
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
          <h4 className="font-semibold text-sm text-slate-800">Cấu hình tài khoản nhận tiền (VietQR)</h4>
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
          <div className="space-y-1">
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

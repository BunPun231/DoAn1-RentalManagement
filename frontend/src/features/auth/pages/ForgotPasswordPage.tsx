import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock reset password
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 500);
  };

  return (
    <div className="flex min-h-screen bg-brand-sand items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="mb-6 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-brand-ink">Khôi phục mật khẩu</h2>
          <p className="text-slate-600 text-sm">
            {!isSent ? "Nhập email của bạn để nhận liên kết đặt lại mật khẩu" : "Kiểm tra email của bạn"}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="example@gmail.com" required />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang gửi..." : "Gửi liên kết"}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">
              Chúng tôi đã gửi một liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư đến.
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-medium text-brand-deep hover:underline">
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

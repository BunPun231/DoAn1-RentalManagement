import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { mockUsers } from "@/data/mock";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Mock authentication
    setTimeout(() => {
      const user = mockUsers.find(u => u.email === email);
      if (user && password) { // Accept any password for mock
        login("mock-jwt-token-12345", user);
        navigate("/dashboard");
      } else {
        setError("Email hoặc mật khẩu không chính xác");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="flex min-h-screen bg-brand-sand">
      {/* Left side - Illustration */}
      <div className="hidden w-1/2 flex-col justify-center bg-brand-deep p-12 text-white lg:flex">
        <h1 className="mb-4 font-display text-4xl font-bold">Smart Boarding House</h1>
        <p className="text-lg text-white/80">Hệ thống quản lý phòng trọ thông minh, tối ưu hóa doanh thu và tiết kiệm thời gian.</p>
        <div className="mt-12">
          {/* Placeholder for illustration */}
          <div className="aspect-[4/3] w-full rounded-2xl bg-white/10 backdrop-blur" />
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="mb-2 font-display text-3xl font-bold text-brand-ink">Đăng nhập</h2>
            <p className="text-slate-600">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            
            <Input
              label="Email"
              type="email"
              placeholder="nhap email (vd: admin@smartboarding.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-brand-deep focus:ring-brand-deep" />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-brand-deep hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-medium text-brand-deep hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

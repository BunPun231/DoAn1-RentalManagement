import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock registration
    setTimeout(() => {
      setIsLoading(false);
      navigate("/login");
    }, 500);
  };

  return (
    <div className="flex min-h-screen bg-brand-sand">
      <div className="hidden w-1/2 flex-col justify-center bg-brand-deep p-12 text-white lg:flex">
        <h1 className="mb-4 font-display text-4xl font-bold">Smart Boarding House</h1>
        <p className="text-lg text-white/80">Bắt đầu quản lý khu trọ của bạn một cách chuyên nghiệp.</p>
        <div className="mt-12">
          <div className="aspect-[4/3] w-full rounded-2xl bg-white/10 backdrop-blur" />
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 xl:px-24 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="mb-2 font-display text-3xl font-bold text-brand-ink">Tạo tài khoản mới</h2>
            <p className="text-slate-600">Điền thông tin bên dưới để đăng ký</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Họ và tên" placeholder="Nguyễn Văn A" required />
              <Input label="Số điện thoại" placeholder="0901234567" required />
            </div>
            
            <Input label="Email" type="email" placeholder="example@gmail.com" required />
            <Input label="Tên khu trọ đầu tiên" placeholder="Khu trọ Sinh viên" required />
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Mật khẩu" type="password" placeholder="Tối thiểu 8 ký tự" required />
              <Input label="Xác nhận mật khẩu" type="password" placeholder="Nhập lại mật khẩu" required />
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-medium text-brand-deep hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

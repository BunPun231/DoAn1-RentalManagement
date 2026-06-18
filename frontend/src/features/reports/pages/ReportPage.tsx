import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

const revenueData = [
  { name: "T1", revenue: 40000000, expense: 5000000 },
  { name: "T2", revenue: 42000000, expense: 6000000 },
  { name: "T3", revenue: 38000000, expense: 4500000 },
  { name: "T4", revenue: 45000000, expense: 7000000 },
  { name: "T5", revenue: 48000000, expense: 5500000 },
  { name: "T6", revenue: 47000000, expense: 5000000 },
];

const capacityData = [
  { name: "Đang thuê", value: 45 },
  { name: "Trống", value: 5 },
  { name: "Bảo trì", value: 2 },
];
const COLORS = ["#10b981", "#94a3b8", "#f59e0b"];

export function ReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display text-brand-ink">Báo cáo & Thống kê</h1>
        <div className="flex gap-2">
          <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
            <option value="2026">Năm 2026</option>
            <option value="2025">Năm 2025</option>
          </select>
          <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-deep">
            <option value="all">Tất cả khu trọ</option>
            <option value="m1">Hoàng Hoa Thám</option>
            <option value="m2">Lý Thường Kiệt</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Doanh thu - Chi phí */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-brand-ink mb-6">Doanh thu & Chi phí</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis 
                  tickFormatter={(value) => `${value / 1000000}M`}
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value as number)}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="revenue" name="Doanh thu" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chi phí" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tỷ lệ lấp đầy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-brand-ink mb-6">Tỷ lệ lấp đầy hiện tại</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={capacityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {capacityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold text-brand-ink">86%</p>
                <p className="text-xs text-slate-500 mt-1">Lấp đầy</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1"></div>
              <p className="text-slate-600">Đang thuê</p>
              <p className="font-semibold text-brand-ink">45</p>
            </div>
            <div>
              <div className="w-3 h-3 rounded-full bg-slate-400 mx-auto mb-1"></div>
              <p className="text-slate-600">Trống</p>
              <p className="font-semibold text-brand-ink">5</p>
            </div>
            <div>
              <div className="w-3 h-3 rounded-full bg-amber-500 mx-auto mb-1"></div>
              <p className="text-slate-600">Bảo trì</p>
              <p className="font-semibold text-brand-ink">2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

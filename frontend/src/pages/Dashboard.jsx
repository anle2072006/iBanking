import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowRightLeft, CheckCircle2, XCircle, Clock } from "lucide-react";
import Layout from "../components/Layout";
import useUser from "../hooks/useUser";
import { getHistory } from "../services/api";

const vnd = (n) => `₫ ${Number(n || 0).toLocaleString("vi-VN")}`;

const statusMap = {
  success: { label: "Thành công", icon: CheckCircle2, color: "text-green-600" },
  failed: { label: "Thất bại", icon: XCircle, color: "text-red-600" },
  expired: { label: "Hết hạn OTP", icon: XCircle, color: "text-red-600" },
  cancelled: { label: "Đã hủy", icon: XCircle, color: "text-gray-400" },
  pending: { label: "Đang xử lý", icon: Clock, color: "text-yellow-600" },
  otp_sent: { label: "Chờ OTP", icon: Clock, color: "text-yellow-600" },
};

const group = (status) => {
  if (status === "success") return "success";
  if (status === "pending" || status === "otp_sent") return "processing";
  return "failed";
};

function Empty({ text }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-gray-400">
      {text}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useUser();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.id) return;
    getHistory(user.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [user.id]);

  const monthly = useMemo(() => {
    const map = new Map();
    [...history]
      .filter((t) => t.status === "success")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((t) => {
        const d = new Date(t.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const row = map.get(key) || { month: `T${d.getMonth() + 1}/${d.getFullYear()}`, total: 0 };
        row.total += t.amount;
        map.set(key, row);
      });
    return [...map.values()];
  }, [history]);

  const summary = useMemo(() => {
    const counts = { success: 0, processing: 0, failed: 0 };
    history.forEach((t) => (counts[group(t.status)] += 1));
    return [
      { name: "Thành công", value: counts.success, color: "#991B1B" },
      { name: "Đang xử lý", value: counts.processing, color: "#F87171" },
      { name: "Thất bại", value: counts.failed, color: "#FCA5A5" },
    ];
  }, [history]);

  const hasHistory = history.length > 0;
  const recent = history.slice(0, 5);

  return (
    <Layout title="Dashboard">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs text-gray-400">Tài khoản · {user.email}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">Số dư khả dụng</p>
            <p className="text-2xl font-semibold text-gray-900">{vnd(user.balance)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/fee-search")}
              className="flex items-center gap-2 rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900"
            >
              <ArrowRightLeft size={15} />
              Thanh toán học phí
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">Học phí đã thanh toán theo tháng</h2>
          {monthly.length === 0 ? (
            <Empty text={loading ? "Đang tải..." : "Chưa có giao dịch thành công nào"} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toLocaleString("vi-VN")}tr`}
                />
                <Tooltip formatter={(v) => vnd(v)} />
                <Bar dataKey="total" fill="#991B1B" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-800">Tổng quan giao dịch</h2>
          {!hasHistory ? (
            <Empty text={loading ? "Đang tải..." : "Chưa có giao dịch nào"} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={summary} innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                    {summary.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} giao dịch`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                {summary.map((s) => (
                  <div key={s.name}>
                    <p className="font-semibold text-gray-800">{s.value}</p>
                    <p className="text-gray-400">{s.name}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Giao dịch gần đây</h2>
          {hasHistory && (
            <button onClick={() => navigate("/history")} className="text-xs font-medium text-red-800 hover:underline">
              Xem tất cả
            </button>
          )}
        </div>

        {!hasHistory ? (
          <p className="py-6 text-center text-sm text-gray-400">
            {loading ? "Đang tải..." : "Bạn chưa có giao dịch nào. Thanh toán học phí để bắt đầu."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-medium">Thời gian</th>
                  <th className="pb-3 font-medium">Mã giao dịch</th>
                  <th className="pb-3 font-medium">MSSV</th>
                  <th className="pb-3 font-medium">Số tiền</th>
                  <th className="pb-3 text-right font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((tx) => {
                  const s = statusMap[tx.status] || statusMap.pending;
                  const Icon = s.icon;
                  return (
                    <tr key={tx._id} className="text-gray-700">
                      <td className="py-3">{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                      <td className="py-3 text-gray-500">{tx._id}</td>
                      <td className="py-3">{tx.mssv}</td>
                      <td className="py-3 font-medium">{vnd(tx.amount)}</td>
                      <td className={`py-3 text-right ${s.color}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon size={16} />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}
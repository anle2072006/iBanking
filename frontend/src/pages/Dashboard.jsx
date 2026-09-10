import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowRightLeft, CheckCircle2, XCircle } from "lucide-react";
import Layout from "../components/Layout";

const moneyFlowData = [
  { month: "T1", nop: 12000000 },
  { month: "T2", nop: 18000000 },
  { month: "T3", nop: 32000000 },
  { month: "T4", nop: 41000000 },
  { month: "T5", nop: 38000000 },
  { month: "T6", nop: 44000000 },
  { month: "T7", nop: 39000000 },
  { month: "T8", nop: 43000000 },
  { month: "T9", nop: 24000000 },
];

const summaryData = [
  { name: "Đã thanh toán", value: 15000, color: "#991B1B" },
  { name: "Đang xử lý", value: 5000, color: "#F87171" },
  { name: "Từ chối", value: 1000, color: "#FCA5A5" },
];

const transactions = [
  { date: "02/09 - 17:40", txId: "BLD/5045546641546", mssv: "52100013", withdraw: "10.000", deposit: "-", balance: "5.000", status: "fail" },
  { date: "02/09 - 08:50", txId: "SOS/6045546641546", mssv: "52100027", withdraw: "-", deposit: "15.000", balance: "15.000", status: "success" },
  { date: "02/09 - 02:00", txId: "SAW/5045546641546", mssv: "52100091", withdraw: "1.000", deposit: "-", balance: "1.000", status: "fail" },
  { date: "02/09 - 09:30", txId: "SAS/7045546641546", mssv: "52100044", withdraw: "500", deposit: "-", balance: "1.500", status: "fail" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <Layout title="Dashboard">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs text-gray-400">Tài khoản · {user.email}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">Số dư khả dụng</p>
            <p className="text-2xl font-semibold text-gray-900">
              ₫ {user.balance?.toLocaleString("vi-VN") ?? "0"}
            </p>
          </div>
          <button
            onClick={() => navigate("/fee-search")}
            className="flex items-center justify-center gap-2 self-start rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900"
          >
            <ArrowRightLeft size={15} />
            Thanh toán học phí
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">
            Biến động học phí
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={moneyFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
              <Tooltip formatter={(v) => `₫ ${v.toLocaleString("vi-VN")}`} />
              <Line type="monotone" dataKey="nop" stroke="#991B1B" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 self-start text-sm font-semibold text-gray-800">
            Tổng quan giao dịch
          </h2>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={summaryData} innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                {summaryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid w-full grid-cols-3 gap-2 text-center text-xs">
            {summaryData.map((s) => (
              <div key={s.name}>
                <p className="font-semibold text-gray-800">₫{s.value.toLocaleString("vi-VN")}</p>
                <p className="text-gray-400">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Giao dịch gần đây</h2>
          <button
            onClick={() => navigate("/history")}
            className="text-xs font-medium text-red-800 hover:underline"
          >
            Xem tất cả
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-3 font-medium">Thời gian</th>
                <th className="pb-3 font-medium">Mã giao dịch</th>
                <th className="pb-3 font-medium">MSSV</th>
                <th className="pb-3 font-medium">Rút</th>
                <th className="pb-3 font-medium">Nộp</th>
                <th className="pb-3 font-medium">Số dư</th>
                <th className="pb-3 font-medium text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.txId} className="text-gray-700">
                  <td className="py-3">{tx.date}</td>
                  <td className="py-3 text-gray-500">{tx.txId}</td>
                  <td className="py-3">{tx.mssv}</td>
                  <td className="py-3">{tx.withdraw !== "-" ? `₫ ${tx.withdraw}` : "-"}</td>
                  <td className="py-3">{tx.deposit !== "-" ? `₫ ${tx.deposit}` : "-"}</td>
                  <td className="py-3 font-medium">₫ {tx.balance}</td>
                  <td className="py-3 text-right">
                    {tx.status === "success" ? (
                      <CheckCircle2 size={18} className="ml-auto text-green-600" />
                    ) : (
                      <XCircle size={18} className="ml-auto text-red-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

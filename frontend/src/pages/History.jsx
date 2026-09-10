import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import Layout from "../components/Layout";
import { getHistory } from "../services/api";

const statusMap = {
  success: { label: "Thành công", icon: CheckCircle2, color: "text-green-600" },
  failed: { label: "Thất bại", icon: XCircle, color: "text-red-600" },
  expired: { label: "Hết hạn OTP", icon: XCircle, color: "text-red-600" },
  pending: { label: "Đang xử lý", icon: Clock, color: "text-yellow-600" },
  otp_sent: { label: "Chờ OTP", icon: Clock, color: "text-yellow-600" },
  cancelled: { label: "Đã hủy", icon: XCircle, color: "text-gray-400" },
};

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!user.id) return;
    getHistory(user.id)
      .then(setTransactions)
      .catch((err) => setError(err.response?.data?.message || "Không tải được lịch sử"))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <Layout title="Lịch sử giao dịch">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        {loading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && transactions.length === 0 && (
          <p className="text-sm text-gray-400">Chưa có giao dịch nào.</p>
        )}

        {transactions.length > 0 && (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-3 font-medium">Thời gian</th>
                <th className="pb-3 font-medium">Mã giao dịch</th>
                <th className="pb-3 font-medium">MSSV</th>
                <th className="pb-3 font-medium">Số tiền</th>
                <th className="pb-3 font-medium text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const s = statusMap[tx.status] || statusMap.pending;
                const Icon = s.icon;
                return (
                  <tr key={tx._id} className="text-gray-700">
                    <td className="py-3">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3 text-gray-500">{tx._id}</td>
                    <td className="py-3">{tx.mssv}</td>
                    <td className="py-3 font-medium">
                      ₫ {tx.amount.toLocaleString("vi-VN")}
                    </td>
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
        )}
      </section>
    </Layout>
  );
}

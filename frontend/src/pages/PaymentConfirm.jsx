import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initiateTransaction } from "../services/api";

export default function PaymentConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const fee = state?.fee;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!fee) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Chưa có thông tin học phí. Vui lòng tra cứu lại.
      </div>
    );
  }

  const amount = fee.requiredAmount - fee.paidAmount;

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await initiateTransaction({
        payerId: user.id,
        mssv: fee.mssv,
        amount,
        payerEmail: user.email,
      });
      navigate("/otp-verify", { state: { transactionId: result.transactionId } });
    } catch (err) {
      setError(err.response?.data?.message || "Không thể khởi tạo giao dịch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">
        Xác nhận thanh toán
      </h1>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
          Người nộp tiền (không thể chỉnh sửa)
        </p>
        <p className="text-sm text-gray-800">{user.hoTen}</p>
        <p className="text-sm text-gray-500">{user.soDienThoai} · {user.email}</p>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
          Thông tin học phí
        </p>
        <p className="text-sm text-gray-800">MSSV: {fee.mssv}</p>
        <p className="text-sm text-gray-800">Họ tên: {fee.hoTenSv}</p>
        <p className="text-sm text-gray-800">
          Số tiền cần thanh toán: ₫ {amount.toLocaleString("vi-VN")}
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
          Thông tin thanh toán
        </p>
        <p className="text-sm text-gray-800">
          Số dư khả dụng: ₫ {user.balance?.toLocaleString("vi-VN")}
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-md bg-red-800 py-2.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
      >
        {loading ? "Đang xử lý..." : "Xác nhận giao dịch"}
      </button>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { lookupFee } from "../services/api";

export default function FeeSearch() {
  const [mssv, setMssv] = useState("");
  const [fee, setFee] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSearch = async () => {
    setError("");
    setFee(null);
    try {
      const data = await lookupFee(mssv);
      setFee(data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tìm thấy MSSV");
    }
  };

  return (
    <Layout title="Tra cứu học phí">
      <div className="mx-auto max-w-xl">
      <div className="flex gap-2">
        <input
          value={mssv}
          onChange={(e) => setMssv(e.target.value)}
          placeholder="Nhập MSSV"
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-red-800 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900"
        >
          Tra cứu
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {fee && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Sinh viên</p>
          <p className="mb-3 font-medium text-gray-900">{fee.hoTenSv} - {fee.mssv}</p>

          <p className="text-sm text-gray-500">Số tiền cần đóng</p>
          <p className="mb-3 font-medium text-gray-900">
            ₫ {(fee.requiredAmount - fee.paidAmount).toLocaleString("vi-VN")}
          </p>

          <p className="text-sm text-gray-500">Trạng thái</p>
          <p className="mb-4 font-medium text-gray-900">{fee.status}</p>

          <button
            disabled={fee.status !== "chua_thanh_toan"}
            onClick={() => navigate("/payment-confirm", { state: { fee } })}
            className="w-full rounded-md bg-red-800 py-2 text-sm font-medium text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Thanh toán ngay
          </button>
        </div>
      )}
      </div>
    </Layout>
  );
}

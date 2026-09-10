import { useLocation, Link } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Result() {
  const { state } = useLocation();
  const success = state?.success ?? false;

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center p-10 text-center">
      {success ? (
        <CheckCircle2 size={56} className="mb-4 text-green-600" />
      ) : (
        <XCircle size={56} className="mb-4 text-red-600" />
      )}
      <h1 className="mb-2 text-lg font-semibold text-gray-900">
        {success ? "Thanh toán thành công" : "Giao dịch thất bại"}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {success
          ? "Học phí đã được cập nhật. Email xác nhận đã được gửi tới bạn."
          : state?.message || "Đã có lỗi xảy ra trong quá trình xử lý."}
      </p>
      <Link
        to="/dashboard"
        className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900"
      >
        Về Dashboard
      </Link>
    </div>
  );
}

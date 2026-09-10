import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOtp } from "../services/api";

const OTP_TTL_SECONDS = 5 * 60;

export default function OtpVerify() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const transactionId = state?.transactionId;
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  if (!transactionId) {
    return <div className="p-6 text-sm text-gray-500">Không có giao dịch đang chờ xác thực.</div>;
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await verifyOtp(transactionId, otp);
      navigate("/result", { state: { success: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Xác thực OTP thất bại");
      if (err.response?.status === 410 || err.response?.status === 409) {
        navigate("/result", { state: { success: false, message: err.response?.data?.message } });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-lg font-semibold text-gray-900">Xác thực OTP</h1>
      <p className="mb-4 text-sm text-gray-500">
        Mã OTP đã được gửi qua email. Còn hiệu lực:{" "}
        <span className={secondsLeft < 30 ? "font-semibold text-red-600" : "font-semibold text-gray-800"}>
          {mm}:{ss}
        </span>
      </p>

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        maxLength={6}
        placeholder="Nhập mã 6 số"
        className="mb-3 w-full rounded-md border border-gray-200 px-3 py-2 text-center text-lg tracking-widest focus:border-red-800 focus:outline-none"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={loading || secondsLeft <= 0}
        className="w-full rounded-md bg-red-800 py-2.5 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60"
      >
        {secondsLeft <= 0 ? "OTP đã hết hạn" : loading ? "Đang xác thực..." : "Xác nhận"}
      </button>
    </div>
  );
}

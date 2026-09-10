import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getProfile } from "../services/api";

export default function Account() {
  const stored = JSON.parse(localStorage.getItem("user") || "{}");
  const [profile, setProfile] = useState(stored);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!stored.id) return;
    getProfile(stored.id)
      .then((data) => setProfile(data))
      .catch((err) => setError(err.response?.data?.message || "Không tải được thông tin tài khoản"));
  }, [stored.id]);

  return (
    <Layout title="Tài khoản">
      <section className="max-w-lg rounded-xl border border-gray-200 bg-white p-5">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400">Họ và tên</p>
            <p className="text-sm font-medium text-gray-900">{profile.hoTen}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Số điện thoại</p>
            <p className="text-sm font-medium text-gray-900">{profile.soDienThoai}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-900">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Số dư khả dụng</p>
            <p className="text-sm font-medium text-gray-900">
              ₫ {profile.balance?.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}

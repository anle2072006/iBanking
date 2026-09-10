import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { token, user } = await login(username, password);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6"
      >
        <h1 className="mb-1 text-lg font-semibold text-gray-900">TDTU Pay</h1>
        <p className="mb-6 text-sm text-gray-500">Đăng nhập vào tài khoản</p>

        <label className="mb-1 block text-xs font-medium text-gray-600">
          Tên đăng nhập
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-red-800 focus:outline-none"
        />

        <label className="mb-1 block text-xs font-medium text-gray-600">
          Mật khẩu
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-red-800 focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md bg-red-800 py-2 text-sm font-medium text-white hover:bg-red-900"
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

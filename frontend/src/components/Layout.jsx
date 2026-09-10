import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Send,
  History,
  User,
  Bell,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tra cứu học phí", icon: Search, path: "/fee-search" },
  { label: "Lịch sử giao dịch", icon: History, path: "/history" },
  { label: "Tài khoản", icon: User, path: "/account" },
];

export default function Layout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-100 font-sans text-gray-800">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white py-6 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-800 text-sm font-bold text-white">
            TP
          </div>
          <span className="text-lg font-semibold text-gray-900">
            TDTU <span className="text-red-800">Pay</span>
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-red-800 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto px-6 pt-6 text-left text-xs text-gray-400 hover:text-red-700"
        >
          Đăng xuất
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
          <div className="flex items-center gap-5">
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell size={20} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                <User size={16} />
              </div>
              <span className="hidden text-sm font-medium text-gray-700 sm:block">
                {user.hoTen || "Người dùng"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}

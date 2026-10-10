import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { lookupFee, getHistory } from "../services/api";

const vnd = (n) => `₫ ${Number(n || 0).toLocaleString("vi-VN")}`;

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem("seenNotifications") || "[]");
  } catch {
    return [];
  }
};

const styles = {
  due: { icon: AlertCircle, color: "text-red-600" },
  processing: { icon: Clock, color: "text-yellow-600" },
  paid: { icon: CheckCircle2, color: "text-green-600" },
};

export default function NotificationBell({ user }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const ref = useRef(null);

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false;

    (async () => {
      const list = [];

      // 1. Học phí của chính sinh viên này còn nợ hay đang xử lý
      if (user.mssv) {
        try {
          const fee = await lookupFee(user.mssv);
          const remaining = fee.requiredAmount - fee.paidAmount;
          if (fee.status === "chua_thanh_toan" && remaining > 0) {
            list.push({
              id: `due-${fee.mssv}-${remaining}`,
              type: "due",
              text: `Học phí MSSV ${fee.mssv} còn ${vnd(remaining)} chưa thanh toán.`,
            });
          } else if (fee.status === "dang_xu_ly") {
            list.push({
              id: `processing-${fee.mssv}`,
              type: "processing",
              text: `Học phí MSSV ${fee.mssv} đang chờ xác thực OTP.`,
            });
          }
        } catch {
          // không tìm thấy học phí thì bỏ qua
        }
      }

      // 2. Các giao dịch thanh toán thành công gần đây
      try {
        const history = await getHistory(user.id);
        history
          .filter((t) => t.status === "success")
          .slice(0, 5)
          .forEach((t) =>
            list.push({
              id: `paid-${t._id}`,
              type: "paid",
              text: `Đã thanh toán thành công ${vnd(t.amount)} học phí MSSV ${t.mssv}.`,
              time: new Date(t.completedAt || t.createdAt).toLocaleString("vi-VN"),
            })
          );
      } catch {
        // lỗi tải lịch sử thì chỉ hiện phần học phí
      }

      if (!cancelled) setItems(list);
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, user.mssv]);

  // Đóng khi bấm ra ngoài
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasUnseen = items.some((n) => !seen.includes(n.id));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const all = [...new Set([...seen, ...items.map((n) => n.id)])];
      setSeen(all);
      try {
        localStorage.setItem("seenNotifications", JSON.stringify(all));
      } catch {
        // bỏ qua nếu không ghi được
      }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative text-gray-400 hover:text-gray-600"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {hasUnseen && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-600" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-3 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
            Thông báo
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Chưa có thông báo nào.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
              {items.map((n) => {
                const { icon: Icon, color } = styles[n.type];
                return (
                  <li key={n.id} className="flex gap-3 px-4 py-3">
                    <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
                    <div>
                      <p className="text-sm text-gray-700">{n.text}</p>
                      {n.time && <p className="mt-0.5 text-xs text-gray-400">{n.time}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
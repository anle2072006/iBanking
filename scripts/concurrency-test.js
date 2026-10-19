/**
 * Kiểm thử trên hệ thống đang chạy (qua API Gateway). Không cần cài thêm thư viện (Node >= 18).
 *
 *   node scripts/concurrency-test.js security   # kiểm tra gateway không lộ route nội bộ / IDOR (không đổi dữ liệu)
 *   node scripts/concurrency-test.js a          # Tình huống A: 1 tài khoản, 2 giao dịch đồng thời
 *   node scripts/concurrency-test.js b          # Tình huống B: 2 tài khoản cùng nộp 1 MSSV
 *
 * Tình huống a / b làm thay đổi dữ liệu -> seed lại trước mỗi lần chạy:
 *   docker-compose exec user-service node seed.js && docker-compose exec fee-service node seed.js
 *
 * Biến môi trường: GATEWAY_URL (mặc định http://localhost:8080/api)
 */
const BASE = process.env.GATEWAY_URL || "http://localhost:8080/api";

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${msg}`);
  if (!cond) failures += 1;
};

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* không có body */ }
  return { status: res.status, data };
}

async function login(username) {
  const r = await call("POST", "/auth/login", { body: { username, password: "123456" } });
  if (r.status !== 200) throw new Error(`Đăng nhập ${username} thất bại (${r.status}): ${JSON.stringify(r.data)}`);
  return { token: r.data.token, id: r.data.user.id, mssv: r.data.user.mssv };
}

const balanceOf = async (u) => (await call("GET", `/users/${u.id}`, { token: u.token })).data.balance;
const feeStatus = async (u, mssv) => (await call("GET", `/fees/${mssv}`, { token: u.token })).data.status;
const pay = (u, mssv) => call("POST", "/transactions", { token: u.token, body: { mssv } });

async function requireFreshData(u1, u2) {
  const ok =
    (await feeStatus(u1, "52100013")) === "chua_thanh_toan" &&
    (await feeStatus(u1, "52100027")) === "chua_thanh_toan" &&
    (await balanceOf(u1)) === 5000000 &&
    (await balanceOf(u2)) === 8000000;
  if (!ok) {
    console.error("Dữ liệu không ở trạng thái ban đầu. Hãy seed lại:\n  docker-compose exec user-service node seed.js && docker-compose exec fee-service node seed.js");
    process.exit(2);
  }
}

async function scenarioA() {
  console.log("Tình huống A - sv001 (số dư 5.000.000đ) nộp 2 học phí cùng lúc: 5.000.000đ + 3.000.000đ");
  const [u1, u2] = [await login("sv001"), await login("sv002")];
  await requireFreshData(u1, u2);

  const results = await Promise.all([pay(u1, "52100013"), pay(u1, "52100027")]);
  console.log("  Kết quả:", results.map((r) => `${r.status} ${r.data?.message || r.data?.status || ""}`).join(" | "));

  const created = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 402 || r.status === 409).length;
  const balance = await balanceOf(u1);
  check(created === 1, "đúng 1 giao dịch được tạo (201)");
  check(rejected === 1, "giao dịch còn lại bị từ chối (402/409)");
  check(balance >= 0, `số dư không bao giờ âm (hiện ${balance})`);
  check([0, 2000000].includes(balance), "số dư = 5.000.000 - số tiền của giao dịch thắng");
}

async function scenarioB() {
  console.log("Tình huống B - sv001 và sv002 cùng nộp học phí MSSV 52100013");
  const [u1, u2] = [await login("sv001"), await login("sv002")];
  await requireFreshData(u1, u2);

  const results = await Promise.all([pay(u1, "52100013"), pay(u2, "52100013")]);
  console.log("  Kết quả:", results.map((r) => `${r.status} ${r.data?.message || r.data?.status || ""}`).join(" | "));

  check(results.filter((r) => r.status === 201).length === 1, "đúng 1 người giữ được chỗ (201)");
  check(results.filter((r) => r.status === 409).length === 1, "người còn lại nhận 409 Conflict");
  const [b1, b2] = [await balanceOf(u1), await balanceOf(u2)];
  const charged = (5000000 - b1) + (8000000 - b2);
  check(charged === 5000000, `tổng tiền bị trừ đúng 1 lần = 5.000.000 (thực tế ${charged})`);
}

async function security() {
  console.log("Bảo mật gateway (không thay đổi dữ liệu)");
  const [u1, u2] = [await login("sv001"), await login("sv002")];

  for (const [method, path] of [
    ["POST", `/users/${u1.id}/deduct`],
    ["POST", `/users/${u1.id}/refund`],
    ["POST", "/fees/52100013/reserve"],
    ["POST", "/fees/52100013/confirm"],
    ["POST", "/fees/52100013/release"],
    ["POST", "/otp/verify"],
  ]) {
    const r = await call(method, path, { token: u1.token, body: { amount: 1000000, transactionId: "a".repeat(24) } });
    check(r.status === 404, `${method} /api${path} -> 404 (route nội bộ không được lộ), nhận ${r.status}`);
  }

  let r = await call("GET", `/users/${u2.id}`, { token: u1.token });
  check(r.status === 403, `sv001 xem profile của sv002 -> 403, nhận ${r.status}`);
  r = await call("GET", `/transactions/user/${u2.id}`, { token: u1.token });
  check(r.status === 403, `sv001 xem lịch sử của sv002 -> 403, nhận ${r.status}`);
  r = await call("GET", `/users/${u1.id}`);
  check(r.status === 401, `không có token -> 401, nhận ${r.status}`);
  r = await call("GET", `/users/${u1.id}`, { token: "token.gia.mao" });
  check(r.status === 401, `token giả -> 401, nhận ${r.status}`);
  r = await call("POST", "/auth/login", { body: { username: { $ne: null }, password: { $ne: null } } });
  check(r.status === 400, `NoSQL injection ở login -> 400, nhận ${r.status}`);
  r = await call("POST", "/transactions", { token: u1.token, body: { mssv: "abc" } });
  check(r.status === 400, `mssv sai định dạng -> 400, nhận ${r.status}`);
  r = await call("POST", "/transactions/abc/verify-otp", { token: u1.token, body: { otpCode: "123456" } });
  check(r.status === 400, `transactionId sai định dạng -> 400, nhận ${r.status}`);
  r = await call("GET", `/users/${u1.id}`, { token: u1.token });
  check(r.status === 200, `xem profile của chính mình -> 200, nhận ${r.status}`);
}

const scenarios = { a: scenarioA, b: scenarioB, security };
const name = (process.argv[2] || "").toLowerCase();
if (!scenarios[name]) {
  console.error("Cách dùng: node scripts/concurrency-test.js <security|a|b>");
  process.exit(2);
}
scenarios[name]()
  .then(() => {
    console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : "\nTất cả kiểm tra đạt");
    process.exit(failures ? 1 : 0);
  })
  .catch((err) => {
    console.error("Lỗi khi chạy test:", err.message);
    process.exit(2);
  });

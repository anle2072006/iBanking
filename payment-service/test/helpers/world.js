const path = require("path");
const loadWithStubs = require("./stubs");
const AppError = require("../../src/utils/AppError");

const src = (p) => require.resolve(path.join(__dirname, "../../src", p));
const tick = () => new Promise((resolve) => setImmediate(resolve));

let seq = 0;
const newId = () => (++seq).toString(16).padStart(24, "0");

/**
 * "Thế giới giả": User Service, Fee Service, OTP Service và DB của Payment được mô phỏng trong bộ nhớ.
 * Mỗi thao tác `await tick()` (để các request song song xen kẽ nhau) rồi thực hiện 1 bước đồng bộ,
 * tương đương 1 lệnh findOneAndUpdate atomic của MongoDB.
 */
exports.makeWorld = ({ users = {}, fees = {} } = {}) => {
  const state = { users: {}, fees: {}, txs: new Map(), sentOtps: [], confirmations: [], faults: {} };
  for (const [id, balance] of Object.entries(users)) {
    // applied/refunded: sổ ghi nhận theo mã giao dịch (giống appliedTx/refundedTx ở User Service)
    state.users[id] = { balance, email: `${id}@x.com`, applied: new Set(), refunded: new Set() };
  }
  for (const [mssv, required] of Object.entries(fees)) {
    state.fees[mssv] = { required, paid: 0, status: "chua_thanh_toan" };
  }
  const fault = (name) => {
    const f = state.faults[name];
    if (f && f.times > 0) {
      f.times -= 1;
      throw f.error;
    }
  };

  const repo = {
    async create(data) {
      await tick();
      const id = newId();
      const tx = { _id: id, createdAt: new Date(), ...data };
      state.txs.set(id, tx);
      return tx;
    },
    async findById(id) { await tick(); return state.txs.get(String(id)) || null; },
    async findHistoryByUser(payerId) { return [...state.txs.values()].filter((t) => t.payerId === payerId); },
    async transition(id, from, to, extra = {}) {
      await tick();
      const tx = state.txs.get(String(id));
      if (!tx || tx.status !== from) return null;
      Object.assign(tx, { status: to }, extra);
      return tx;
    },
    async findStale(status, olderThanMs) {
      return [...state.txs.values()].filter(
        (t) => t.status === status && t.createdAt < new Date(Date.now() - olderThanMs)
      );
    },
  };

  const userClient = {
    async getProfile(userId) {
      await tick();
      const u = state.users[userId];
      if (!u) {
        const err = new Error("not found");
        err.response = { status: 404 };
        throw err;
      }
      return { id: userId, email: u.email, balance: u.balance };
    },
    async deductBalance(userId, amount, txId) {
      await tick();
      const u = state.users[userId];
      if (u.applied.has(txId)) return { success: true, balance: u.balance }; // idempotent
      if (u.balance >= amount) {
        u.balance -= amount;
        u.applied.add(txId);
        return { success: true, balance: u.balance };
      }
      return { success: false, statusCode: 409, message: "Số dư không đủ để thực hiện giao dịch" };
    },
    async refundBalance(userId, amount, txId) {
      await tick();
      fault("refund");
      const u = state.users[userId];
      // Chỉ hoàn khi giao dịch này đã bị trừ tiền và chưa được hoàn
      if (u.applied.has(txId) && !u.refunded.has(txId)) {
        u.balance += amount;
        u.refunded.add(txId);
      }
      return { success: true };
    },
  };

  const feeClient = {
    async lookup(mssv) {
      await tick();
      const f = state.fees[mssv];
      if (!f) {
        const err = new Error("not found");
        err.response = { status: 404, data: { message: "Không tìm thấy MSSV" } };
        throw err;
      }
      return { mssv, requiredAmount: f.required, paidAmount: f.paid, status: f.status };
    },
    async reserve(mssv) {
      await tick();
      const f = state.fees[mssv];
      if (f.status === "chua_thanh_toan") {
        f.status = "dang_xu_ly";
        return { success: true };
      }
      return { success: false, statusCode: 409, message: "Học phí đang được xử lý hoặc đã thanh toán" };
    },
    async confirmPayment(mssv, amount) {
      await tick();
      fault("confirm");
      const f = state.fees[mssv];
      if (f.status !== "dang_xu_ly") throw new AppError(409, "Không thể xác nhận thanh toán");
      f.status = "da_thanh_toan";
      f.paid += amount;
      return {};
    },
    async release(mssv) {
      await tick();
      const f = state.fees[mssv];
      if (f.status === "dang_xu_ly") f.status = "chua_thanh_toan";
      return {};
    },
  };

  const otpClient = {
    verifyResult: { success: true },
    async requestOtp(txId, email) {
      await tick();
      fault("otp");
      state.sentOtps.push({ txId, email });
      return { otpSent: true };
    },
    async verifyOtp() { await tick(); return otpClient.verifyResult; },
    async sendConfirmation(payload) { state.confirmations.push(payload); return { queued: true }; },
  };

  const service = loadWithStubs(src("services/transaction.service.js"), {
    [src("repositories/transaction.repository.js")]: repo,
    [src("clients/feeService.client.js")]: feeClient,
    [src("clients/userService.client.js")]: userClient,
    [src("clients/otpService.client.js")]: otpClient,
  });

  return { service, state, otpClient, setFault: (name, error, times = 1) => (state.faults[name] = { error, times }) };
};

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const loadWithStubs = require("./helpers/stubs");

const tick = () => new Promise((resolve) => setImmediate(resolve));

// Repository giả: mỗi hàm là 1 bước đồng bộ sau `await tick()` (mô phỏng 1 lệnh findOneAndUpdate atomic)
const setup = (balance) => {
  const user = { balance, applied: new Set(), refunded: new Set() };
  const repo = {
    async atomicDeduct(id, amount, txId) {
      await tick();
      if (user.balance >= amount && !(txId && user.applied.has(txId))) {
        user.balance -= amount;
        if (txId) user.applied.add(txId);
        return { balance: user.balance };
      }
      return null;
    },
    async hasApplied(id, txId) { return user.applied.has(txId); },
    async findById() { return { balance: user.balance }; },
    async atomicRefund(id, amount, txId) {
      await tick();
      if (txId && !(user.applied.has(txId) && !user.refunded.has(txId))) return null;
      user.balance += amount;
      if (txId) user.refunded.add(txId);
      return { balance: user.balance };
    },
  };
  const service = loadWithStubs(path.join(__dirname, "../src/services/user.service.js"), {
    [require.resolve("../src/repositories/user.repository.js")]: repo,
    bcryptjs: {},
    jsonwebtoken: {},
  });
  return { user, service };
};

test("Tình huống A: 2 lần trừ tiền cùng lúc, số dư chỉ đủ cho 1", async () => {
  const { user, service } = setup(5_000_000);
  const results = await Promise.allSettled([
    service.deductBalance("u", 4_000_000),
    service.deductBalance("u", 4_000_000),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.statusCode, 409);
  assert.equal(user.balance, 1_000_000);
});

test("trừ tiền rồi hoàn tiền thì số dư về ban đầu", async () => {
  const { user, service } = setup(5_000_000);
  await service.deductBalance("u", 2_000_000);
  await service.refundBalance("u", 2_000_000);
  assert.equal(user.balance, 5_000_000);
});

test("trừ tiền lặp lại cùng mã giao dịch: chỉ trừ 1 lần (idempotent)", async () => {
  const { user, service } = setup(5_000_000);
  await service.deductBalance("u", 2_000_000, "tx1");
  const again = await service.deductBalance("u", 2_000_000, "tx1");
  assert.equal(again.balance, 3_000_000);
  assert.equal(user.balance, 3_000_000);
});

test("hoàn tiền: chỉ hoàn giao dịch đã trừ, và chỉ hoàn 1 lần", async () => {
  const { user, service } = setup(5_000_000);
  await service.refundBalance("u", 2_000_000, "chua-tru"); // chưa từng trừ -> không hoàn
  assert.equal(user.balance, 5_000_000);

  await service.deductBalance("u", 2_000_000, "tx1");
  await service.refundBalance("u", 2_000_000, "tx1");
  await service.refundBalance("u", 2_000_000, "tx1"); // lần 2 không cộng thêm
  assert.equal(user.balance, 5_000_000);
});
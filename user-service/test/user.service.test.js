const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const loadWithStubs = require("./helpers/stubs");

const tick = () => new Promise((resolve) => setImmediate(resolve));

// Repository giả: mỗi hàm là 1 bước đồng bộ sau `await tick()` (mô phỏng 1 lệnh findOneAndUpdate atomic)
const setup = (balance) => {
  const user = { balance };
  const repo = {
    async atomicDeduct(id, amount) {
      await tick();
      if (user.balance >= amount) {
        user.balance -= amount;
        return { balance: user.balance };
      }
      return null;
    },
    async atomicRefund(id, amount) {
      await tick();
      user.balance += amount;
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

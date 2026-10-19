const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const loadWithStubs = require("./helpers/stubs");

const tick = () => new Promise((resolve) => setImmediate(resolve));

const setup = () => {
  const fee = { status: "chua_thanh_toan", paidAmount: 0 };
  const repo = {
    async findByMssv() { return fee; },
    async reserve() {
      await tick();
      if (fee.status !== "chua_thanh_toan") return null;
      fee.status = "dang_xu_ly";
      return fee;
    },
    async confirmPayment(mssv, amount) {
      await tick();
      if (fee.status !== "dang_xu_ly") return null;
      fee.status = "da_thanh_toan";
      fee.paidAmount += amount;
      return fee;
    },
    async release() {
      await tick();
      if (fee.status !== "dang_xu_ly") return null;
      fee.status = "chua_thanh_toan";
      return fee;
    },
  };
  const service = loadWithStubs(path.join(__dirname, "../src/services/fee.service.js"), {
    [require.resolve("../src/repositories/fee.repository.js")]: repo,
  });
  return { fee, service };
};

test("Tình huống B: 5 giao dịch cùng reserve 1 MSSV, chỉ 1 thành công", async () => {
  const { service } = setup();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => service.reserve("52100013")));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(results.filter((r) => r.status === "rejected").every((r) => r.reason.statusCode === 409));
});

test("reserve -> confirm; học phí đã thanh toán thì không reserve lại được", async () => {
  const { fee, service } = setup();
  await service.reserve("52100013");
  await service.confirmPayment("52100013", 5_000_000);
  assert.equal(fee.status, "da_thanh_toan");
  assert.equal(fee.paidAmount, 5_000_000);
  await assert.rejects(() => service.reserve("52100013"), (e) => e.statusCode === 409);
});

test("confirm khi chưa reserve bị từ chối (409)", async () => {
  const { service } = setup();
  await assert.rejects(() => service.confirmPayment("52100013", 1), (e) => e.statusCode === 409);
});

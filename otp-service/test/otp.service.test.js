const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const loadWithStubs = require("./helpers/stubs");

const tick = () => new Promise((resolve) => setImmediate(resolve));
const T = "a".repeat(24);

const setup = () => {
  const db = new Map();
  const sent = [];
  const repo = {
    async create(data) { db.set(data.transactionId, { ...data, isUsed: false, attemptCount: 0 }); },
    async findByTransactionId(id) { await tick(); return db.get(id) || null; },
    async markUsedIfValid(id, otpCode) {
      await tick();
      const r = db.get(id);
      if (!r || r.otpCode !== otpCode || r.isUsed || r.expiredAt <= new Date()) return null;
      r.isUsed = true;
      return r;
    },
    async incrementAttempt(id) { await tick(); db.get(id).attemptCount += 1; },
  };
  const publisher = { async publishSendOtpEmail(m) { sent.push(m); } };
  const service = loadWithStubs(path.join(__dirname, "../src/services/otp.service.js"), {
    [require.resolve("../src/repositories/otp.repository.js")]: repo,
    [require.resolve("../src/queue/publisher.js")]: publisher,
  });
  return { db, sent, service };
};

test("sinh OTP 6 chữ số và gửi qua publisher", async () => {
  const { service, sent } = setup();
  await service.generateAndSend({ transactionId: T, email: "a@x.com" });
  assert.match(sent[0].otpCode, /^\d{6}$/);
});

test("verify đúng thì thành công, dùng lại lần 2 bị từ chối", async () => {
  const { service, sent } = setup();
  await service.generateAndSend({ transactionId: T, email: "a@x.com" });
  assert.deepEqual(await service.verify(T, sent[0].otpCode), { verified: true });
  await assert.rejects(() => service.verify(T, sent[0].otpCode), (e) => e.statusCode === 400);
});

test("2 request verify đúng mã cùng lúc: chỉ 1 thành công (idempotent)", async () => {
  const { service, sent } = setup();
  await service.generateAndSend({ transactionId: T, email: "a@x.com" });
  const results = await Promise.allSettled([
    service.verify(T, sent[0].otpCode),
    service.verify(T, sent[0].otpCode),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});

test("nhập sai: 400, sau 5 lần sai thì 429", async () => {
  const { service, sent } = setup();
  await service.generateAndSend({ transactionId: T, email: "a@x.com" });
  const wrong = sent[0].otpCode === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) {
    await assert.rejects(() => service.verify(T, wrong), (e) => e.statusCode === 400);
  }
  await assert.rejects(() => service.verify(T, wrong), (e) => e.statusCode === 429);
});

test("OTP hết hạn -> 410; không có OTP -> 404", async () => {
  const { service, db, sent } = setup();
  await service.generateAndSend({ transactionId: T, email: "a@x.com" });
  db.get(T).expiredAt = new Date(Date.now() - 1000);
  await assert.rejects(() => service.verify(T, sent[0].otpCode), (e) => e.statusCode === 410);
  await assert.rejects(() => service.verify("b".repeat(24), "123456"), (e) => e.statusCode === 404);
});

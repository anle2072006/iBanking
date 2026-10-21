const test = require("node:test");
const assert = require("node:assert/strict");
const { makeWorld } = require("./helpers/world");

const U1 = "a".repeat(24);
const U2 = "b".repeat(24);
const ok = (r) => r.status === "fulfilled";
const age = (tx, ms) => (tx.createdAt = new Date(Date.now() - ms));

test("luồng thành công: trừ tiền, giữ chỗ, OTP đúng -> success, gạch nợ, gửi email xác nhận", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const r = await w.service.initiate({ payerId: U1, mssv: "52100013" });
  assert.equal(r.status, "otp_sent");
  assert.equal(w.state.users[U1].balance, 0);
  assert.equal(w.state.fees["52100013"].status, "dang_xu_ly");
  assert.equal(w.state.sentOtps[0].email, `${U1}@x.com`); // email lấy từ User Service

  const done = await w.service.verifyOtp(String(r.transactionId), "123456", U1);
  assert.equal(done.status, "success");
  assert.equal(w.state.fees["52100013"].status, "da_thanh_toan");
  assert.equal(w.state.fees["52100013"].paid, 5_000_000);
  assert.equal(w.state.confirmations.length, 1);
});

test("số tiền do server tính; amount/payerEmail do client gửi bị bỏ qua", async () => {
  const w = makeWorld({ users: { [U1]: 9_000_000 }, fees: { 52100013: 5_000_000 } });
  w.state.fees["52100013"].paid = 1_000_000;
  const r = await w.service.initiate({ payerId: U1, mssv: "52100013", amount: 1, payerEmail: "evil@x.com" });
  const tx = w.state.txs.get(String(r.transactionId));
  assert.equal(tx.amount, 4_000_000);
  assert.equal(tx.payerEmail, `${U1}@x.com`);
  assert.equal(w.state.users[U1].balance, 5_000_000);
});

test("MSSV không tồn tại -> 404; học phí đã thanh toán -> 409; người dùng không tồn tại -> 401", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 1_000_000 } });
  await assert.rejects(() => w.service.initiate({ payerId: U1, mssv: "99999999" }), (e) => e.statusCode === 404);
  await assert.rejects(() => w.service.initiate({ payerId: "c".repeat(24), mssv: "52100013" }), (e) => e.statusCode === 401);
  w.state.fees["52100013"].status = "da_thanh_toan";
  await assert.rejects(() => w.service.initiate({ payerId: U1, mssv: "52100013" }), (e) => e.statusCode === 409);
  assert.equal(w.state.users[U1].balance, 5_000_000);
});

test("không xác thực OTP được giao dịch của người khác (404)", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000, [U2]: 5_000_000 }, fees: { 52100013: 1_000_000 } });
  const r = await w.service.initiate({ payerId: U1, mssv: "52100013" });
  await assert.rejects(() => w.service.verifyOtp(String(r.transactionId), "123456", U2), (e) => e.statusCode === 404);
  assert.equal(w.state.txs.get(String(r.transactionId)).status, "otp_sent");
});

test("Tình huống A: 1 tài khoản, 2 giao dịch cùng lúc - chỉ 1 thành công, số dư không âm", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000, 52100027: 3_000_000 } });
  const results = await Promise.allSettled([
    w.service.initiate({ payerId: U1, mssv: "52100013" }),
    w.service.initiate({ payerId: U1, mssv: "52100027" }),
  ]);
  assert.equal(results.filter(ok).length, 1);
  assert.equal(results.find((r) => !ok(r)).reason.statusCode, 402);
  assert.ok(w.state.users[U1].balance >= 0);
  // học phí của giao dịch thua phải được nhả lại
  assert.equal(Object.values(w.state.fees).filter((f) => f.status === "dang_xu_ly").length, 1);
});

test("Tình huống B: 2 tài khoản cùng nộp 1 MSSV - chỉ 1 thành công, người thua không bị trừ tiền", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000, [U2]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const results = await Promise.allSettled([
    w.service.initiate({ payerId: U1, mssv: "52100013" }),
    w.service.initiate({ payerId: U2, mssv: "52100013" }),
  ]);
  assert.equal(results.filter(ok).length, 1);
  assert.equal(results.find((r) => !ok(r)).reason.statusCode, 409);
  assert.deepEqual([w.state.users[U1].balance, w.state.users[U2].balance].sort(), [0, 5_000_000]);
});

test("20 request đồng thời vào cùng 1 học phí: đúng 1 thắng, đúng 1 người bị trừ tiền", async () => {
  const ids = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(24, "c"));
  const users = Object.fromEntries(ids.map((id) => [id, 10_000_000]));
  const w = makeWorld({ users, fees: { 52100013: 5_000_000 } });
  const results = await Promise.allSettled(ids.map((id) => w.service.initiate({ payerId: id, mssv: "52100013" })));
  assert.equal(results.filter(ok).length, 1);
  assert.equal(ids.filter((id) => w.state.users[id].balance !== 10_000_000).length, 1);
});

test("gửi OTP lỗi -> hoàn tiền, nhả học phí, giao dịch failed", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  w.setFault("otp", new Error("rabbit down"));
  await assert.rejects(() => w.service.initiate({ payerId: U1, mssv: "52100013" }), (e) => e.statusCode === 502);
  assert.equal(w.state.users[U1].balance, 5_000_000);
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
  assert.equal([...w.state.txs.values()][0].status, "failed");
});

test("OTP sai (400) không hoàn tiền; hết lượt thử (429) thì hoàn tiền và failed", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);

  w.otpClient.verifyResult = { success: false, statusCode: 400, message: "Mã OTP không đúng" };
  await assert.rejects(() => w.service.verifyOtp(id, "000000", U1), (e) => e.statusCode === 400);
  assert.equal(w.state.txs.get(id).status, "otp_sent");
  assert.equal(w.state.users[U1].balance, 0);

  w.otpClient.verifyResult = { success: false, statusCode: 429, message: "Vượt quá số lần" };
  await assert.rejects(() => w.service.verifyOtp(id, "000000", U1), (e) => e.statusCode === 429);
  assert.equal(w.state.txs.get(id).status, "failed");
  assert.equal(w.state.users[U1].balance, 5_000_000);
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
});

test("OTP hết hạn (410) -> expired + hoàn tiền", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  w.otpClient.verifyResult = { success: false, statusCode: 410, message: "Mã OTP đã hết hạn" };
  await assert.rejects(() => w.service.verifyOtp(id, "123456", U1), (e) => e.statusCode === 410);
  assert.equal(w.state.txs.get(id).status, "expired");
  assert.equal(w.state.users[U1].balance, 5_000_000);
});

test("xác nhận học phí lỗi -> hoàn tác toàn bộ", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  w.setFault("confirm", new Error("fee down"));
  await assert.rejects(() => w.service.verifyOtp(id, "123456", U1), (e) => e.statusCode === 500);
  assert.equal(w.state.users[U1].balance, 5_000_000);
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
});

test("2 request verify đúng cùng lúc: chỉ 1 gạch nợ, chỉ 1 email", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  const results = await Promise.allSettled([
    w.service.verifyOtp(id, "123456", U1),
    w.service.verifyOtp(id, "123456", U1),
  ]);
  assert.equal(w.state.fees["52100013"].paid, 5_000_000);
  assert.equal(w.state.confirmations.length, 1);
  assert.ok(results.some(ok));
});

test("expireStale: otp_sent quá 5 phút -> expired + hoàn tiền + nhả học phí", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  age(w.state.txs.get(id), 6 * 60 * 1000);
  await w.service.expireStale();
  assert.equal(w.state.txs.get(id).status, "expired");
  assert.equal(w.state.users[U1].balance, 5_000_000);
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
});

test("expireStale: pending kẹt quá 2 phút (service sập giữa chừng) -> failed + hoàn tiền", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  const tx = w.state.txs.get(id);
  tx.status = "pending";
  age(tx, 3 * 60 * 1000);
  await w.service.expireStale();
  assert.equal(tx.status, "failed");
  assert.equal(w.state.users[U1].balance, 5_000_000);
});

test("lịch sử chỉ gồm giao dịch của người dùng đó", async () => {
  const w = makeWorld({ users: { [U1]: 9_000_000, [U2]: 9_000_000 }, fees: { 52100013: 1_000_000, 52100027: 1_000_000 } });
  await w.service.initiate({ payerId: U1, mssv: "52100013" });
  await w.service.initiate({ payerId: U2, mssv: "52100027" });
  const history = await w.service.getHistory(U1);
  assert.equal(history.length, 1);
  assert.equal(history[0].payerId, U1);
});

test("không đủ số dư: giao dịch được ghi nhận là failed, học phí được nhả, số dư không đổi", async () => {
  const w = makeWorld({ users: { [U1]: 1_000 }, fees: { 52100013: 5_000_000 } });
  await assert.rejects(() => w.service.initiate({ payerId: U1, mssv: "52100013" }), (e) => e.statusCode === 402);
  assert.equal(w.state.users[U1].balance, 1_000);
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
  assert.equal([...w.state.txs.values()][0].status, "failed");
});

test("service sập TRƯỚC khi trừ tiền (pending chưa bị trừ): dọn dẹp không làm số dư tăng ảo", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  w.state.fees["52100013"].status = "dang_xu_ly";
  const id = "d".repeat(24);
  const tx = { _id: id, payerId: U1, mssv: "52100013", amount: 5_000_000, status: "pending", createdAt: new Date(Date.now() - 3 * 60 * 1000) };
  w.state.txs.set(id, tx);
  await w.service.expireStale();
  assert.equal(tx.status, "failed");
  assert.equal(w.state.users[U1].balance, 5_000_000); // không bị cộng thêm
  assert.equal(w.state.fees["52100013"].status, "chua_thanh_toan");
});

test("service sập SAU khi trừ tiền (pending đã bị trừ): dọn dẹp hoàn đúng 1 lần", async () => {
  const w = makeWorld({ users: { [U1]: 5_000_000 }, fees: { 52100013: 5_000_000 } });
  const id = String((await w.service.initiate({ payerId: U1, mssv: "52100013" })).transactionId);
  const tx = w.state.txs.get(id);
  tx.status = "pending";
  age(tx, 3 * 60 * 1000);
  await w.service.expireStale();
  await w.service.expireStale(); // chạy lần 2 cũng không hoàn thêm
  assert.equal(w.state.users[U1].balance, 5_000_000);
});

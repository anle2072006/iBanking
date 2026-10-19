const test = require("node:test");
const assert = require("node:assert/strict");
const guard = require("../src/middlewares/routeGuard");

const run = (middleware, method, path, userId = "u1") => {
  const req = { method, path, userId };
  const res = { statusCode: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = () => res;
  let passed = false;
  middleware(req, res, () => (passed = true));
  return { passed, status: res.statusCode };
};

test("/auth: chỉ cho POST /login", () => {
  assert.equal(run(guard.authGuard, "POST", "/login").passed, true);
  assert.equal(run(guard.authGuard, "GET", "/login").status, 404);
  assert.equal(run(guard.authGuard, "POST", "/login/x").status, 404);
});

test("/users: chỉ GET /:id của chính mình; deduct/refund bị chặn", () => {
  assert.equal(run(guard.usersGuard, "GET", "/u1").passed, true);
  assert.equal(run(guard.usersGuard, "GET", "/u2").status, 403); // xem của người khác
  assert.equal(run(guard.usersGuard, "POST", "/u1/deduct").status, 404);
  assert.equal(run(guard.usersGuard, "POST", "/u1/refund").status, 404); // tự cộng tiền
  assert.equal(run(guard.usersGuard, "GET", "/u1/deduct").status, 404);
  assert.equal(run(guard.usersGuard, "GET", "/").status, 404);
});

test("/fees: chỉ GET /:mssv; reserve/confirm/release bị chặn", () => {
  assert.equal(run(guard.feesGuard, "GET", "/52100013").passed, true);
  for (const action of ["reserve", "confirm", "release"]) {
    assert.equal(run(guard.feesGuard, "POST", `/52100013/${action}`).status, 404);
    assert.equal(run(guard.feesGuard, "GET", `/52100013/${action}`).status, 404);
  }
});

test("/transactions: chỉ POST /, POST /:id/verify-otp, GET /user/:userId của mình", () => {
  assert.equal(run(guard.transactionsGuard, "POST", "/").passed, true);
  assert.equal(run(guard.transactionsGuard, "POST", "/abc/verify-otp").passed, true);
  assert.equal(run(guard.transactionsGuard, "GET", "/user/u1").passed, true);
  assert.equal(run(guard.transactionsGuard, "GET", "/user/u2").status, 403);
  assert.equal(run(guard.transactionsGuard, "GET", "/abc").status, 404);
  assert.equal(run(guard.transactionsGuard, "POST", "/abc/other").status, 404);
  assert.equal(run(guard.transactionsGuard, "DELETE", "/").status, 404);
});

test("không thể lách bằng ký tự mã hoá hoặc dấu / thừa", () => {
  assert.equal(run(guard.usersGuard, "GET", "/u1%2Fdeduct").status, 403);
  assert.equal(run(guard.usersGuard, "GET", "//deduct").status, 404);
  assert.equal(run(guard.transactionsGuard, "GET", "/user/u1/extra").status, 404);
});

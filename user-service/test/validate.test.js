const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate");

const bad = (e) => e.statusCode === 400;

test("amount phải là số nguyên dương", () => {
  assert.equal(v.amount(1000), 1000);
  for (const x of [0, -5, 1.5, "100", null, undefined, NaN, { $gt: 0 }]) {
    assert.throws(() => v.amount(x), bad);
  }
});

test("objectId", () => {
  assert.equal(v.objectId("a".repeat(24)), "a".repeat(24));
  for (const x of ["abc", undefined, { $ne: 1 }]) assert.throws(() => v.objectId(x), bad);
});

test("login chặn NoSQL injection và dữ liệu sai kiểu", () => {
  assert.deepEqual(v.loginBody({ username: " sv001 ", password: "123456" }), {
    username: "sv001",
    password: "123456",
  });
  for (const body of [
    { username: { $ne: null }, password: "x" },
    { username: "sv001", password: { $ne: "" } },
    { username: "ab", password: "x" },
    { username: "sv001", password: "" },
    {},
    undefined,
  ]) {
    assert.throws(() => v.loginBody(body), bad);
  }
});

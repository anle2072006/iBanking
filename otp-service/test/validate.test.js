const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate");

const bad = (e) => e.statusCode === 400;

test("transactionId", () => {
  assert.equal(v.transactionId("a".repeat(24)), "a".repeat(24));
  for (const x of ["abc", undefined, { $ne: 1 }]) assert.throws(() => v.transactionId(x), bad);
});

test("email", () => {
  assert.equal(v.email("sv001@gmail.com"), "sv001@gmail.com");
  for (const x of ["khong-phai-email", "", undefined, { $ne: 1 }]) assert.throws(() => v.email(x), bad);
});

test("otpCode", () => {
  assert.equal(v.otpCode("123456"), "123456");
  for (const x of ["12345", 123456, "abcdef", null]) assert.throws(() => v.otpCode(x), bad);
});

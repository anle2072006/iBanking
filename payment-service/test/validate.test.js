const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate");

const bad = (e) => e.statusCode === 400;

test("mssv", () => {
  assert.equal(v.mssv("52100013"), "52100013");
  for (const x of [undefined, "", "abc", 52100013, { $ne: null }, "1".repeat(30)]) {
    assert.throws(() => v.mssv(x), bad);
  }
});

test("otpCode phải đúng 6 chữ số dạng chuỗi", () => {
  assert.equal(v.otpCode("012345"), "012345");
  for (const x of ["12345", "1234567", "abcdef", 123456, null, { $gt: "" }]) {
    assert.throws(() => v.otpCode(x), bad);
  }
});

test("objectId", () => {
  assert.equal(v.objectId("a".repeat(24)), "a".repeat(24));
  for (const x of ["123", undefined, { $ne: 1 }, "z".repeat(24)]) {
    assert.throws(() => v.objectId(x), bad);
  }
});

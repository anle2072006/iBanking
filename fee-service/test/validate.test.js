const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/utils/validate");

const bad = (e) => e.statusCode === 400;

test("mssv", () => {
  assert.equal(v.mssv("52100013"), "52100013");
  for (const x of ["", "abc", "52 100", 52100013, { $ne: null }, "1".repeat(20)]) {
    assert.throws(() => v.mssv(x), bad);
  }
});

test("amount phải là số nguyên dương", () => {
  assert.equal(v.amount(5000000), 5000000);
  for (const x of [0, -1, 2.5, "5", undefined]) assert.throws(() => v.amount(x), bad);
});

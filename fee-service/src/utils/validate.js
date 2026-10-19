const AppError = require("./AppError");

const MSSV = /^[A-Za-z0-9]{6,12}$/;

exports.mssv = (value) => {
  if (typeof value !== "string" || !MSSV.test(value)) {
    throw new AppError(400, "MSSV không hợp lệ");
  }
  return value;
};

exports.amount = (value) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(400, "Số tiền phải là số nguyên dương");
  }
  return value;
};

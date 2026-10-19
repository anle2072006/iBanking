const AppError = require("./AppError");

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.transactionId = (value) => {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) {
    throw new AppError(400, "transactionId không hợp lệ");
  }
  return value;
};

exports.email = (value) => {
  if (typeof value !== "string" || value.length > 254 || !EMAIL.test(value)) {
    throw new AppError(400, "Email không hợp lệ");
  }
  return value;
};

exports.otpCode = (value) => {
  if (typeof value !== "string" || !/^\d{6}$/.test(value)) {
    throw new AppError(400, "OTP phải gồm đúng 6 chữ số");
  }
  return value;
};

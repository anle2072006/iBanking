const AppError = require("./AppError");

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const MSSV = /^[A-Za-z0-9]{6,12}$/;

exports.objectId = (value, label = "id") => {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) {
    throw new AppError(400, `${label} không hợp lệ`);
  }
  return value;
};

exports.mssv = (value) => {
  if (typeof value !== "string" || !MSSV.test(value)) {
    throw new AppError(400, "MSSV không hợp lệ");
  }
  return value;
};

exports.otpCode = (value) => {
  if (typeof value !== "string" || !/^\d{6}$/.test(value)) {
    throw new AppError(400, "OTP phải gồm đúng 6 chữ số");
  }
  return value;
};

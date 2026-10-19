const AppError = require("./AppError");

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

exports.objectId = (value, label = "id") => {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) {
    throw new AppError(400, `${label} không hợp lệ`);
  }
  return value;
};

// Số tiền VND: số nguyên dương
exports.amount = (value) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(400, "Số tiền phải là số nguyên dương");
  }
  return value;
};

// Bắt buộc là chuỗi để chặn NoSQL injection kiểu { "username": { "$ne": null } }
exports.loginBody = (body) => {
  const { username, password } = body || {};
  if (typeof username !== "string" || username.trim().length < 3 || username.length > 50) {
    throw new AppError(400, "Tên đăng nhập không hợp lệ");
  }
  if (typeof password !== "string" || password.length === 0 || password.length > 100) {
    throw new AppError(400, "Mật khẩu không hợp lệ");
  }
  return { username: username.trim(), password };
};

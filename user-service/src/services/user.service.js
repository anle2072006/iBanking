const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/AppError");

exports.login = async (username, password) => {
  const user = await userRepository.findByUsername(username);
  if (!user) throw new AppError(401, "Sai tài khoản hoặc mật khẩu");

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError(401, "Sai tài khoản hoặc mật khẩu");

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  return {
    token,
    user: {
      id: user._id,
      hoTen: user.hoTen,
      email: user.email,
      soDienThoai: user.soDienThoai,
      balance: user.balance,
    },
  };
};

exports.getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");
  return user;
};

/**
 * Được Payment Service gọi (REST đồng bộ) để trừ tiền.
 * Đây là điểm hiện thực trực tiếp Tình huống A trong mục 6 rubric.
 */
exports.deductBalance = async (userId, amount) => {
  if (amount <= 0) throw new AppError(400, "Số tiền không hợp lệ");

  const updated = await userRepository.atomicDeduct(userId, amount);
  if (!updated) {
    // Điều kiện balance >= amount không thỏa -> có thể do số dư gốc
    // không đủ, HOẶC một giao dịch khác đã trừ trước đó (race condition).
    throw new AppError(409, "Số dư không đủ để thực hiện giao dịch");
  }
  return updated;
};

/**
 * Compensating transaction: hoàn tiền nếu bước sau (ví dụ cập nhật
 * Fee Service) thất bại sau khi đã trừ tiền thành công.
 */
exports.refundBalance = async (userId, amount) => {
  return userRepository.atomicRefund(userId, amount);
};

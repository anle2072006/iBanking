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
      mssv: user.mssv,
    },
  };
};

exports.getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError(404, "Không tìm thấy người dùng");
  return {
    id: user._id,
    hoTen: user.hoTen,
    email: user.email,
    soDienThoai: user.soDienThoai,
    balance: user.balance,
    mssv: user.mssv,
  };
};

exports.deductBalance = async (userId, amount, txId) => {
  if (amount <= 0) throw new AppError(400, "Số tiền không hợp lệ");

  const updated = await userRepository.atomicDeduct(userId, amount, txId);
  if (updated) return updated;

  // Gọi lại cùng 1 mã giao dịch sau khi đã trừ thành công -> idempotent, coi như thành công
  if (txId && (await userRepository.hasApplied(userId, txId))) {
    return userRepository.findById(userId);
  }
  // Điều kiện balance >= amount không thỏa -> có thể do số dư gốc
  // không đủ, HOẶC một giao dịch khác đã trừ trước đó (race condition).
  throw new AppError(409, "Số dư không đủ để thực hiện giao dịch");
};

/**
 * Compensating transaction: hoàn tiền cho đúng giao dịch đã bị trừ.
 */
exports.refundBalance = async (userId, amount, txId) => {
  const updated = await userRepository.atomicRefund(userId, amount, txId);
  if (updated) return updated;
  // Giao dịch này chưa từng bị trừ tiền, hoặc đã được hoàn rồi -> không hoàn thêm (idempotent)
  return userRepository.findById(userId);
};
const User = require("../models/user.model");

exports.findById = (id) => User.findById(id);

exports.findByUsername = (username) => User.findOne({ username });

/**
 * Trừ số dư một cách ATOMIC: điều kiện "balance >= amount" nằm ngay
 * trong query filter, MongoDB đảm bảo findOneAndUpdate là 1 thao tác
 * không thể chia nhỏ (atomic) ở cấp độ document.
 *
 * Nếu 2 request cùng gọi hàm này đồng thời cho cùng 1 userId,
 * chỉ request nào query trước (theo thứ tự xử lý nội bộ của MongoDB)
 * mới thấy điều kiện đúng; request sau đọc balance đã bị trừ và
 * có thể không còn đủ điều kiện -> trả về null.
 */
exports.atomicDeduct = (userId, amount) =>
  User.findOneAndUpdate(
    { _id: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

/**
 * Hoàn tiền (dùng cho compensating transaction khi bước sau thất bại) */
exports.atomicRefund = (userId, amount) =>
  User.findOneAndUpdate(
    { _id: userId },
    { $inc: { balance: amount } },
    { new: true }
  );

exports.create = (data) => User.create(data);

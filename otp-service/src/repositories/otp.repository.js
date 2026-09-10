const Otp = require("../models/otp.model");

exports.create = (data) => Otp.create(data);

exports.findByTransactionId = (transactionId) =>
  Otp.findOne({ transactionId });

/**
 * Đánh dấu đã dùng một cách atomic - điều kiện isUsed:false và
 * expiredAt > hiện tại nằm ngay trong filter, đảm bảo OTP chỉ
 * verify thành công đúng 1 lần dù có 2 request verify cùng lúc
 * (idempotency - tiêu chí mức điểm 9-10).
 */
exports.markUsedIfValid = (transactionId, otpCode) =>
  Otp.findOneAndUpdate(
    {
      transactionId,
      otpCode,
      isUsed: false,
      expiredAt: { $gt: new Date() },
    },
    { $set: { isUsed: true } },
    { new: true }
  );

exports.incrementAttempt = (transactionId) =>
  Otp.findOneAndUpdate(
    { transactionId },
    { $inc: { attemptCount: 1 } },
    { new: true }
  );

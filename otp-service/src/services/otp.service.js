const crypto = require("crypto");
const otpRepository = require("../repositories/otp.repository");
const publisher = require("../queue/publisher");
const AppError = require("../utils/AppError");

const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút, đúng đề bài
const MAX_ATTEMPTS = 5;

// Được Payment Service gọi (REST) sau khi khởi tạo giao dịch thành công
exports.generateAndSend = async ({ transactionId, email }) => {
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const expiredAt = new Date(Date.now() + OTP_TTL_MS);

  await otpRepository.create({ transactionId, email, otpCode, expiredAt });

  // Gửi bất đồng bộ qua RabbitMQ - không chặn response của Payment Service
  await publisher.publishSendOtpEmail({ email, otpCode, transactionId });

  return { otpSent: true, expiredAt };
};

exports.verify = async (transactionId, otpCode) => {
  const otpRecord = await otpRepository.findByTransactionId(transactionId);
  if (!otpRecord) throw new AppError(404, "Không tìm thấy OTP cho giao dịch này");

  if (otpRecord.attemptCount >= MAX_ATTEMPTS) {
    throw new AppError(429, "Vượt quá số lần nhập OTP cho phép");
  }

  if (new Date() > otpRecord.expiredAt) {
    throw new AppError(410, "Mã OTP đã hết hạn");
  }

  const updated = await otpRepository.markUsedIfValid(transactionId, otpCode);
  if (!updated) {
    await otpRepository.incrementAttempt(transactionId);
    throw new AppError(400, "Mã OTP không đúng hoặc đã được sử dụng");
  }

  return { verified: true };
};

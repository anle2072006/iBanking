const transactionRepository = require("../repositories/transaction.repository");
const feeClient = require("../clients/feeService.client");
const userClient = require("../clients/userService.client");
const otpClient = require("../clients/otpService.client");
const AppError = require("../utils/AppError");

/**
 * Khởi tạo giao dịch - đúng thứ tự đã vẽ trong sequence diagram Tình huống B:
 *   1. Khóa (reserve) khoản học phí TRƯỚC
 *   2. Trừ tiền SAU
 *   3. Nếu bước 2 thất bại -> nhả lại khóa (compensating transaction)
 * Thứ tự này đảm bảo: nếu học phí đã có người khác giữ chỗ, hệ thống
 * từ chối ngay ở bước 1, không bao giờ đụng đến tiền của người dùng.
 */
exports.initiate = async ({ payerId, mssv, amount, payerEmail }) => {
  // Bước 1: kiểm tra thông tin học phí + số tiền hợp lệ
  const fee = await feeClient.lookup(mssv);
  if (fee.status === "da_thanh_toan") {
    throw new AppError(409, "Học phí này đã được thanh toán");
  }
  const remaining = fee.requiredAmount - fee.paidAmount;
  if (amount > remaining) {
    throw new AppError(400, `Số tiền vượt quá số học phí còn thiếu (${remaining})`);
  }

  // Bước 2: giữ chỗ khoản học phí (atomic ở Fee Service)
  const reserveResult = await feeClient.reserve(mssv);
  if (!reserveResult.success) {
    throw new AppError(
      reserveResult.statusCode === 409 ? 409 : 500,
      reserveResult.message
    );
  }

  // Bước 3: trừ tiền người nộp (atomic ở User Service)
  const deductResult = await userClient.deductBalance(payerId, amount);
  if (!deductResult.success) {
    // Compensating transaction: nhả lại khóa vì chưa trừ được tiền
    await feeClient.release(mssv);
    throw new AppError(
      deductResult.statusCode === 409 ? 402 : 500,
      deductResult.message || "Số dư không đủ"
    );
  }

  // Bước 4: tạo bản ghi giao dịch, trạng thái "pending"
  const transaction = await transactionRepository.create({
    payerId,
    mssv,
    amount,
    status: "pending",
  });

  // Bước 5: yêu cầu OTP Service sinh mã & gửi email - GỌI BẤT ĐỒNG BỘ
  // (OTP Service tự publish message lên RabbitMQ, Payment Service không chờ)
  await otpClient.requestOtp(transaction._id.toString(), payerEmail);
  await transactionRepository.updateStatus(transaction._id, "otp_sent");

  return { transactionId: transaction._id, status: "otp_sent" };
};

/**
 * Xác thực OTP - bước cuối cùng hoàn tất giao dịch.
 * Nếu OTP hết hạn/sai -> coi giao dịch thất bại, phải compensate
 * (hoàn tiền + nhả khóa học phí) vì tiền đã bị trừ ở bước initiate.
 */
exports.verifyOtp = async (transactionId, otpCode) => {
  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction) throw new AppError(404, "Không tìm thấy giao dịch");
  if (transaction.status !== "otp_sent") {
    throw new AppError(409, "Giao dịch không ở trạng thái chờ xác thực OTP");
  }

  const otpResult = await otpClient.verifyOtp(transactionId, otpCode);

  if (!otpResult.success) {
    const failStatus = otpResult.statusCode === 410 ? "expired" : "failed";
    await transactionRepository.updateStatus(transaction._id, failStatus);

    // Compensating transaction: hoàn tiền + nhả khóa học phí
    await userClient.refundBalance(transaction.payerId, transaction.amount);
    await feeClient.release(transaction.mssv);

    throw new AppError(otpResult.statusCode || 400, otpResult.message);
  }

  // OTP đúng -> xác nhận thanh toán ở Fee Service, hoàn tất giao dịch
  await feeClient.confirmPayment(transaction.mssv, transaction.amount);
  const updated = await transactionRepository.updateStatus(transaction._id, "success", {
    completedAt: new Date(),
  });

  return updated;
};

exports.getHistory = async (payerId) => transactionRepository.findHistoryByUser(payerId);

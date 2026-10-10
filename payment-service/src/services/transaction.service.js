const transactionRepository = require("../repositories/transaction.repository");
const feeClient = require("../clients/feeService.client");
const userClient = require("../clients/userService.client");
const otpClient = require("../clients/otpService.client");
const AppError = require("../utils/AppError");

const OTP_WINDOW_MS = 5 * 60 * 1000 + 10 * 1000; // 5 phút OTP + 10s du di
const PENDING_STUCK_MS = 2 * 60 * 1000;

// Compensating transaction: hoàn tiền + nhả khóa học phí
const compensate = async (tx) => {
  await userClient.refundBalance(tx.payerId, tx.amount);
  await feeClient.release(tx.mssv);
};

exports.initiate = async ({ payerId, mssv, amount, payerEmail }) => {
  const fee = await feeClient.lookup(mssv);
  if (fee.status === "da_thanh_toan") {
    throw new AppError(409, "Học phí này đã được thanh toán");
  }
  const remaining = fee.requiredAmount - fee.paidAmount;
  if (amount > remaining) {
    throw new AppError(400, `Số tiền vượt quá số học phí còn thiếu (${remaining})`);
  }

  // 1. Giữ chỗ học phí (atomic) - chặn tình huống B
  const reserveResult = await feeClient.reserve(mssv);
  if (!reserveResult.success) {
    throw new AppError(
      reserveResult.statusCode === 409 ? 409 : 500,
      reserveResult.message
    );
  }

  // 2. Trừ tiền (atomic) - chặn tình huống A
  const deductResult = await userClient.deductBalance(payerId, amount);
  if (!deductResult.success) {
    await feeClient.release(mssv);
    throw new AppError(
      deductResult.statusCode === 409 ? 402 : 500,
      deductResult.message || "Số dư không đủ"
    );
  }

  // 3. Ghi giao dịch
  const transaction = await transactionRepository.create({
    payerId,
    mssv,
    amount,
    payerEmail,
    status: "pending",
  });

  // 4. Gọi OTP Service; lỗi thì hoàn tác toàn bộ
  try {
    await otpClient.requestOtp(transaction._id.toString(), payerEmail);
  } catch (err) {
    const claimed = await transactionRepository.transition(
      transaction._id, "pending", "failed"
    );
    if (claimed) await compensate(claimed);
    throw new AppError(502, "Không gửi được OTP, giao dịch đã được hoàn tác");
  }

  await transactionRepository.transition(transaction._id, "pending", "otp_sent");
  return { transactionId: transaction._id, status: "otp_sent" };
};

exports.verifyOtp = async (transactionId, otpCode) => {
  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction) throw new AppError(404, "Không tìm thấy giao dịch");
  if (transaction.status !== "otp_sent") {
    throw new AppError(409, "Giao dịch không ở trạng thái chờ xác thực OTP");
  }

  const otpResult = await otpClient.verifyOtp(transactionId, otpCode);

  if (!otpResult.success) {
    // 410 = OTP hết hạn, 429 = hết lượt thử -> giao dịch chết, hoàn tiền
    if (otpResult.statusCode === 410 || otpResult.statusCode === 429) {
      const newStatus = otpResult.statusCode === 410 ? "expired" : "failed";
      const claimed = await transactionRepository.transition(
        transaction._id, "otp_sent", newStatus
      );
      if (claimed) await compensate(claimed);
    }
    // 400 (sai mã) -> KHÔNG hoàn tiền, cho người dùng nhập lại
    throw new AppError(otpResult.statusCode || 400, otpResult.message);
  }

  // OTP đúng -> gạch nợ học phí
  try {
    await feeClient.confirmPayment(transaction.mssv, transaction.amount);
  } catch (err) {
    const claimed = await transactionRepository.transition(
      transaction._id, "otp_sent", "failed"
    );
    if (claimed) await compensate(claimed);
    throw new AppError(500, "Không thể xác nhận học phí, giao dịch đã được hoàn tác");
  }

  const done = await transactionRepository.transition(transaction._id, "otp_sent", "success", {
    completedAt: new Date(),
  });

  // Gửi email xác nhận (bất đồng bộ). Lỗi gửi mail KHÔNG làm hỏng giao dịch đã thành công.
  if (done) {
    otpClient
      .sendConfirmation({
        transactionId: done._id.toString(),
        email: done.payerEmail,
        mssv: done.mssv,
        amount: done.amount,
      })
      .catch((err) => console.error("[Payment Service] Gửi email xác nhận lỗi:", err.message));
  }

  return done;
};

exports.getHistory = async (payerId) => transactionRepository.findHistoryByUser(payerId);

/**
 * Chạy định kỳ: dọn giao dịch bị bỏ dở.
 *  - otp_sent quá 5 phút -> expired + hoàn tiền + nhả học phí
 *  - pending quá 2 phút  -> failed  + hoàn tiền + nhả học phí (service sập giữa chừng)
 */
exports.expireStale = async () => {
  const jobs = [
    ["otp_sent", OTP_WINDOW_MS, "expired"],
    ["pending", PENDING_STUCK_MS, "failed"],
  ];
  for (const [from, ageMs, to] of jobs) {
    const stale = await transactionRepository.findStale(from, ageMs);
    for (const tx of stale) {
      const claimed = await transactionRepository.transition(tx._id, from, to);
      if (!claimed) continue; // request khác đã xử lý rồi
      try {
        await compensate(claimed);
        console.log(`[Payment Service] Đã ${to} và hoàn tiền giao dịch ${tx._id}`);
      } catch (err) {
        console.error(`[Payment Service] Hoàn tiền lỗi giao dịch ${tx._id}:`, err.message);
      }
    }
  }
};
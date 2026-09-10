const feeRepository = require("../repositories/fee.repository");
const AppError = require("../utils/AppError");

exports.lookupByMssv = async (mssv) => {
  const fee = await feeRepository.findByMssv(mssv);
  if (!fee) throw new AppError(404, "Không tìm thấy MSSV");
  return fee;
};

// Được Payment Service gọi đầu tiên trong luồng thanh toán
exports.reserve = async (mssv) => {
  const reserved = await feeRepository.reserve(mssv);
  if (!reserved) {
    throw new AppError(409, "Học phí đang được xử lý hoặc đã thanh toán");
  }
  return reserved;
};

exports.confirmPayment = async (mssv, amount) => {
  const fee = await feeRepository.confirmPayment(mssv, amount);
  if (!fee) throw new AppError(409, "Không thể xác nhận thanh toán");
  return fee;
};

exports.release = async (mssv) => feeRepository.release(mssv);

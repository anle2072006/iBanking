const TuitionFee = require("../models/fee.model");

exports.findByMssv = (mssv) => TuitionFee.findOne({ mssv });

/**
 * "Giữ chỗ" khoản học phí - atomic update.
 * Điều kiện status = "chua_thanh_toan" nằm ngay trong filter, nên nếu
 * 2 giao dịch cùng gọi hàm này cho cùng 1 MSSV, chỉ 1 giao dịch thấy
 * điều kiện đúng và chuyển được sang "dang_xu_ly" - giao dịch còn lại
 * nhận về null (đã bị người khác giữ chỗ trước).
 */
exports.reserve = (mssv) =>
  TuitionFee.findOneAndUpdate(
    { mssv, status: "chua_thanh_toan" },
    { $set: { status: "dang_xu_ly" } },
    { new: true }
  );

/** Xác nhận thanh toán thành công sau khi User Service trừ tiền OK */
exports.confirmPayment = (mssv, amount) =>
  TuitionFee.findOneAndUpdate(
    { mssv, status: "dang_xu_ly" },
    { $set: { status: "da_thanh_toan" }, $inc: { paidAmount: amount } },
    { new: true }
  );

/**
 * Compensating transaction: nhả lại "chỗ" nếu bước trừ tiền
 * ở User Service thất bại sau khi đã reserve.
 */
exports.release = (mssv) =>
  TuitionFee.findOneAndUpdate(
    { mssv, status: "dang_xu_ly" },
    { $set: { status: "chua_thanh_toan" } },
    { new: true }
  );

exports.create = (data) => TuitionFee.create(data);

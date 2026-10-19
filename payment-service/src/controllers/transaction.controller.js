const transactionService = require("../services/transaction.service");
const validate = require("../utils/validate");
const AppError = require("../utils/AppError");

// userId do API Gateway gắn vào header x-user-id SAU khi đã xác thực JWT.
// Không lấy từ body vì client có thể gửi payerId của người khác.
const getUserId = (req) => {
  const userId = req.headers["x-user-id"];
  if (!userId) throw new AppError(401, "Thiếu thông tin người dùng đã xác thực");
  return validate.objectId(userId, "userId");
};

exports.initiate = async (req, res, next) => {
  try {
    const payerId = getUserId(req);
    // Chỉ nhận mssv từ client. Số tiền do server tính, email lấy từ User Service.
    const mssv = validate.mssv(req.body.mssv);
    const result = await transactionService.initiate({ payerId, mssv });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const transactionId = validate.objectId(req.params.id, "transactionId");
    const otpCode = validate.otpCode(req.body.otpCode);
    const result = await transactionService.verifyOtp(transactionId, otpCode, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    // Chỉ được xem lịch sử của chính mình
    if (validate.objectId(req.params.userId, "userId") !== userId) {
      throw new AppError(403, "Không có quyền xem lịch sử của người khác");
    }
    const history = await transactionService.getHistory(userId);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
};

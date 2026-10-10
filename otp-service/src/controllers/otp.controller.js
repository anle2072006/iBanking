const otpService = require("../services/otp.service");
const publisher = require("../queue/publisher");

exports.generate = async (req, res, next) => {
  try {
    const { transactionId, email } = req.body;
    const result = await otpService.generateAndSend({ transactionId, email });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { transactionId, otpCode } = req.body;
    const result = await otpService.verify(transactionId, otpCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.confirmation = async (req, res, next) => {
  try {
    const { transactionId, email, mssv, amount } = req.body;
    if (!email || !transactionId) {
      return res.status(400).json({ message: "Thiếu email hoặc mã giao dịch" });
    }
    await publisher.publishConfirmationEmail({ email, transactionId, mssv, amount });
    res.status(202).json({ queued: true });
  } catch (err) {
    next(err);
  }
};

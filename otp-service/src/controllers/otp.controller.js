const otpService = require("../services/otp.service");

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

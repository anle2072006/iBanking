const otpService = require("../services/otp.service");
const publisher = require("../queue/publisher");
const validate = require("../utils/validate");

exports.generate = async (req, res, next) => {
  try {
    const transactionId = validate.transactionId(req.body.transactionId);
    const email = validate.email(req.body.email);
    const result = await otpService.generateAndSend({ transactionId, email });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const transactionId = validate.transactionId(req.body.transactionId);
    const otpCode = validate.otpCode(req.body.otpCode);
    const result = await otpService.verify(transactionId, otpCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.confirmation = async (req, res, next) => {
  try {
    const { mssv, amount } = req.body;
    const transactionId = validate.transactionId(req.body.transactionId);
    const email = validate.email(req.body.email);
    await publisher.publishConfirmationEmail({ email, transactionId, mssv, amount });
    res.status(202).json({ queued: true });
  } catch (err) {
    next(err);
  }
};

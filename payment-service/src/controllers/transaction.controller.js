const transactionService = require("../services/transaction.service");

exports.initiate = async (req, res, next) => {
  try {
    const { payerId, mssv, amount, payerEmail } = req.body;
    const result = await transactionService.initiate({ payerId, mssv, amount, payerEmail });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { otpCode } = req.body;
    const result = await transactionService.verifyOtp(req.params.id, otpCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await transactionService.getHistory(req.params.userId);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
};

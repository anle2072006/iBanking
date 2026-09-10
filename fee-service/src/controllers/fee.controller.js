const feeService = require("../services/fee.service");

exports.lookup = async (req, res, next) => {
  try {
    const fee = await feeService.lookupByMssv(req.params.mssv);
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.reserve = async (req, res, next) => {
  try {
    const fee = await feeService.reserve(req.params.mssv);
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const fee = await feeService.confirmPayment(req.params.mssv, amount);
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.release = async (req, res, next) => {
  try {
    const fee = await feeService.release(req.params.mssv);
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

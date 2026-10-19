const feeService = require("../services/fee.service");
const validate = require("../utils/validate");

exports.lookup = async (req, res, next) => {
  try {
    const fee = await feeService.lookupByMssv(validate.mssv(req.params.mssv));
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.reserve = async (req, res, next) => {
  try {
    const fee = await feeService.reserve(validate.mssv(req.params.mssv));
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const mssv = validate.mssv(req.params.mssv);
    const amount = validate.amount(req.body.amount);
    const fee = await feeService.confirmPayment(mssv, amount);
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

exports.release = async (req, res, next) => {
  try {
    const fee = await feeService.release(validate.mssv(req.params.mssv));
    res.status(200).json(fee);
  } catch (err) {
    next(err);
  }
};

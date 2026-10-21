const userService = require("../services/user.service");
const validate = require("../utils/validate");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = validate.loginBody(req.body);
    const result = await userService.login(username, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(validate.objectId(req.params.id, "userId"));
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.deductBalance = async (req, res, next) => {
  try {
    const userId = validate.objectId(req.params.id, "userId");
    const amount = validate.amount(req.body.amount);
    const transactionId = validate.objectId(req.body.transactionId, "transactionId");
    const user = await userService.deductBalance(userId, amount, transactionId);
    res.status(200).json({ success: true, balance: user.balance });
  } catch (err) {
    next(err);
  }
};

exports.refundBalance = async (req, res, next) => {
  try {
    const userId = validate.objectId(req.params.id, "userId");
    const amount = validate.amount(req.body.amount);
    const transactionId = validate.objectId(req.body.transactionId, "transactionId");
    const user = await userService.refundBalance(userId, amount, transactionId);
    res.status(200).json({ success: true, balance: user?.balance });
  } catch (err) {
    next(err);
  }
};

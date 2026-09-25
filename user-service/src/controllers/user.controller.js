const userService = require("../services/user.service");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await userService.login(username, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.deductBalance = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const user = await userService.deductBalance(req.params.id, amount);
    res.status(200).json({ success: true, balance: user.balance });
  } catch (err) {
    next(err);
  }
};

exports.refundBalance = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const user = await userService.refundBalance(req.params.id, amount);
    res.status(200).json({ success: true, balance: user.balance });
  } catch (err) {
    next(err);
  }
};

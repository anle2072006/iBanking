const User = require("../models/user.model");

exports.findById = (id) => User.findById(id);

exports.findByUsername = (username) => User.findOne({ username });

exports.atomicDeduct = (userId, amount) =>
  User.findOneAndUpdate(
    { _id: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

//hoàn tiền
exports.atomicRefund = (userId, amount) =>
  User.findOneAndUpdate(
    { _id: userId },
    { $inc: { balance: amount } },
    { new: true }
  );

exports.create = (data) => User.create(data);

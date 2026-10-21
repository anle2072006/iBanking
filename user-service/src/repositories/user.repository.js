const User = require("../models/user.model");

exports.findById = (id) => User.findById(id);

exports.findByUsername = (username) => User.findOne({ username });

exports.atomicDeduct = (userId, amount, txId) =>
  User.findOneAndUpdate(
    txId
      ? { _id: userId, balance: { $gte: amount }, appliedTx: { $ne: txId } }
      : { _id: userId, balance: { $gte: amount } },
    txId
      ? { $inc: { balance: -amount }, $push: { appliedTx: txId } }
      : { $inc: { balance: -amount } },
    { new: true }
  );

exports.hasApplied = (userId, txId) => User.exists({ _id: userId, appliedTx: txId });

exports.atomicRefund = (userId, amount, txId) =>
  User.findOneAndUpdate(
    txId
      ? { _id: userId, appliedTx: txId, refundedTx: { $ne: txId } }
      : { _id: userId },
    txId
      ? { $inc: { balance: amount }, $push: { refundedTx: txId } }
      : { $inc: { balance: amount } },
    { new: true }
  );

exports.create = (data) => User.create(data);
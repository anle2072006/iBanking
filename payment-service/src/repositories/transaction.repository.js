const Transaction = require("../models/transaction.model");

exports.create = (data) => Transaction.create(data);

exports.findById = (id) => Transaction.findById(id);

exports.updateStatus = (id, status, extra = {}) =>
  Transaction.findByIdAndUpdate(id, { status, ...extra }, { new: true });

exports.findHistoryByUser = (payerId) =>
  Transaction.find({ payerId }).sort({ createdAt: -1 });

exports.transition = (id, from, to, extra = {}) =>
  Transaction.findOneAndUpdate(
    { _id: id, status: from },
    { $set: { status: to, ...extra } },
    { new: true }
  );

exports.findStale = (status, olderThanMs) =>
  Transaction.find({
    status,
    createdAt: { $lt: new Date(Date.now() - olderThanMs) },
  });

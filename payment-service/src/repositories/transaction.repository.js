const Transaction = require("../models/transaction.model");

exports.create = (data) => Transaction.create(data);

exports.findById = (id) => Transaction.findById(id);

exports.updateStatus = (id, status, extra = {}) =>
  Transaction.findByIdAndUpdate(id, { status, ...extra }, { new: true });

exports.findHistoryByUser = (payerId) =>
  Transaction.find({ payerId }).sort({ createdAt: -1 });

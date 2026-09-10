const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    payerId: { type: String, required: true },
    mssv: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "otp_sent", "success", "failed", "expired", "cancelled"],
      default: "pending",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);

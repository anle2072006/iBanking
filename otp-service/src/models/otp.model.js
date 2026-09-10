const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    otpCode: { type: String, required: true },
    expiredAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    attemptCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);

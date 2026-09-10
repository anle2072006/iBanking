const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
  {
    mssv: { type: String, required: true, unique: true },
    hoTenSv: { type: String, required: true },
    requiredAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["chua_thanh_toan", "dang_xu_ly", "da_thanh_toan"],
      default: "chua_thanh_toan",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TuitionFee", feeSchema);

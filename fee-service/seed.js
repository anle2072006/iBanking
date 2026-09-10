// Chạy: node seed.js (sau khi fee-service đang chạy và kết nối MongoDB)
require("dotenv").config();
const mongoose = require("mongoose");
const TuitionFee = require("./src/models/fee.model");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await TuitionFee.deleteMany({});
  await TuitionFee.create([
    {
      mssv: "52100013",
      hoTenSv: "Nguyễn Văn A",
      requiredAmount: 5000000,
      paidAmount: 0,
      status: "chua_thanh_toan",
    },
    {
      mssv: "52100027",
      hoTenSv: "Trần Thị B",
      requiredAmount: 3000000,
      paidAmount: 0,
      status: "chua_thanh_toan",
    },
  ]);

  console.log("Seed Fee Service thành công. Thử tra cứu MSSV: 52100013 hoặc 52100027");
  process.exit(0);
}

seed();

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/user.model");

// Email nhận OTP. Đặt bằng biến môi trường SEED_EMAIL khi chạy seed.
const SEED_EMAIL = process.env.SEED_EMAIL || "sv@example.com";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await User.deleteMany({});
  const passwordHash = await bcrypt.hash("123456", 10);

  await User.create([
    {
      username: "sv001",
      passwordHash,
      hoTen: "Nguyễn Văn A",
      soDienThoai: "0901234567",
      email: SEED_EMAIL,
      mssv: "52100013",
      balance: 5000000,
    },
    {
      username: "sv002",
      passwordHash,
      hoTen: "Trần Thị B",
      soDienThoai: "0907654321",
      email: SEED_EMAIL,
      mssv: "52100027",
      balance: 8000000,
    },
  ]);

  console.log(`Seed User Service thành công (email OTP: ${SEED_EMAIL}). Đăng nhập bằng sv001/123456 hoặc sv002/123456`);
  process.exit(0);
}

seed();
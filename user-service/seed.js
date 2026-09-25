require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/user.model");

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
      email: "nguyenvana@example.com",
      balance: 5000000,
    },
    {
      username: "sv002",
      passwordHash,
      hoTen: "Trần Thị B",
      soDienThoai: "0907654321",
      email: "tranthib@example.com",
      balance: 8000000,
    },
  ]);

  console.log("Seed User Service thành công. Đăng nhập bằng sv001/123456 hoặc sv002/123456");
  process.exit(0);
}

seed();

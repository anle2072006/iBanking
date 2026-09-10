require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const otpRoutes = require("./routes/otp.routes");
const startConsumer = require("./queue/consumer");

const app = express();
app.use(express.json());
app.use("/api", otpRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Lỗi hệ thống" });
});

const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("[OTP Service] Kết nối MongoDB thành công");
    await startConsumer(); // bắt đầu lắng nghe queue gửi email bất đồng bộ
    app.listen(PORT, () => console.log(`[OTP Service] đang chạy ở port ${PORT}`));
  })
  .catch((err) => console.error("[OTP Service] Lỗi kết nối:", err));

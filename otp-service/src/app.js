require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const otpRoutes = require("./routes/otp.routes");
const startConsumer = require("./queue/consumer");

const app = express();
app.use(express.json());
app.get("/health", (req, res) => res.status(200).json({ service: "otp-service", status: "ok" }));
app.use("/api", otpRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Lỗi hệ thống" });
});

const PORT = process.env.PORT || 3004;

// MongoDB / RabbitMQ có thể khởi động chậm hơn service này: thử lại thay vì để service sập
const retry = async (fn, name, delayMs = 5000) => {
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      console.error(`[OTP Service] ${name} chưa sẵn sàng (${err.message}), thử lại sau ${delayMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

(async () => {
  await retry(() => mongoose.connect(process.env.MONGO_URI), "MongoDB");
  console.log("[OTP Service] Kết nối MongoDB thành công");

  app.listen(PORT, () => console.log(`[OTP Service] đang chạy ở port ${PORT}`));

  // bắt đầu lắng nghe queue gửi email bất đồng bộ (chờ RabbitMQ nếu chưa sẵn sàng)
  await retry(startConsumer, "RabbitMQ");
})();

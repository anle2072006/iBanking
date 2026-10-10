require("dotenv").config();
const transactionService = require("./services/transaction.service");
const express = require("express");
const mongoose = require("mongoose");
const transactionRoutes = require("./routes/transaction.routes");

const app = express();
app.use(express.json());
app.use("/api", transactionRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Lỗi hệ thống" });
});

const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGO_URI)
    .then(() => {
    console.log("[Payment Service] Kết nối MongoDB thành công");
    app.listen(PORT, () => console.log(`[Payment Service] đang chạy ở port ${PORT}`));

    // Dọn giao dịch quá hạn mỗi 30 giây
    setInterval(() => {
      transactionService.expireStale().catch((e) => console.error(e.message));
    }, 30 * 1000);
  })
  .catch((err) => console.error("[Payment Service] Lỗi kết nối:", err));
  
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const feeRoutes = require("./routes/fee.routes");

const app = express();
app.use(express.json());
app.use("/api", feeRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Lỗi hệ thống" });
});

const PORT = process.env.PORT || 3002;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("[Fee Service] Kết nối MongoDB thành công");
    app.listen(PORT, () => console.log(`[Fee Service] đang chạy ở port ${PORT}`));
  })
  .catch((err) => console.error("[Fee Service] Lỗi kết nối MongoDB:", err));

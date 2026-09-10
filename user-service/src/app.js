require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user.routes");

const app = express();
app.use(express.json());
app.use("/api", userRoutes);

// Error handler tập trung - trả đúng status code AppError đã set
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({ message: err.message || "Lỗi hệ thống" });
});

const PORT = process.env.PORT || 3001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("[User Service] Kết nối MongoDB thành công");
    app.listen(PORT, () => console.log(`[User Service] đang chạy ở port ${PORT}`));
  })
  .catch((err) => console.error("[User Service] Lỗi kết nối MongoDB:", err));

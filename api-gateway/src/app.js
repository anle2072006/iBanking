 require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authMiddleware = require("./middlewares/auth.middleware");
const routes = require("./routes");

const app = express();
app.use(cors());
app.use(authMiddleware);
app.use("/api", routes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[API Gateway] đang chạy ở port ${PORT}`));

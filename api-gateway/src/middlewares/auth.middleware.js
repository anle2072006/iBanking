const jwt = require("jsonwebtoken");

// Danh sách route công khai, không cần token
const PUBLIC_PATHS = ["/api/auth/login"];

module.exports = (req, res, next) => {
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Thiếu token xác thực" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};

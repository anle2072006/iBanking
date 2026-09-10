const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const router = express.Router();

router.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/auth/" },
  })
);

router.use(
  "/users",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/users/" },
  })
);

router.use(
  "/fees",
  createProxyMiddleware({
    target: process.env.FEE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/fees/" },
  })
);

router.use(
  "/transactions",
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/transactions/" },
  })
);

module.exports = router;

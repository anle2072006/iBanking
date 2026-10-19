const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  authGuard,
  usersGuard,
  feesGuard,
  transactionsGuard,
} = require("../middlewares/routeGuard");
const router = express.Router();

router.use(
  "/auth",
  authGuard,
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/auth/" },
  })
);

router.use(
  "/users",
  usersGuard,
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/users/" },
  })
);

router.use(
  "/fees",
  feesGuard,
  createProxyMiddleware({
    target: process.env.FEE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/fees/" },
  })
);

router.use(
  "/transactions",
  transactionsGuard,
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/api/transactions/" },
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-user-id", String(req.userId));
      },
    },
  })
);

module.exports = router;
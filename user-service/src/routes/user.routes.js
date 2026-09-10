const express = require("express");
const router = express.Router();
const controller = require("../controllers/user.controller");

router.post("/auth/login", controller.login);
router.get("/users/:id", controller.getProfile);
router.post("/users/:id/deduct", controller.deductBalance);
router.post("/users/:id/refund", controller.refundBalance);

module.exports = router;

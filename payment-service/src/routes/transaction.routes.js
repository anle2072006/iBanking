const express = require("express");
const router = express.Router();
const controller = require("../controllers/transaction.controller");

router.post("/transactions", controller.initiate);
router.post("/transactions/:id/verify-otp", controller.verifyOtp);
router.get("/users/:userId/transactions", controller.getHistory);

module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("../controllers/fee.controller");

router.get("/fees/:mssv", controller.lookup);
router.post("/fees/:mssv/reserve", controller.reserve);
router.post("/fees/:mssv/confirm", controller.confirmPayment);
router.post("/fees/:mssv/release", controller.release);

module.exports = router;

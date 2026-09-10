const express = require("express");
const router = express.Router();
const controller = require("../controllers/otp.controller");

router.post("/otp/generate", controller.generate);
router.post("/otp/verify", controller.verify);

module.exports = router;
